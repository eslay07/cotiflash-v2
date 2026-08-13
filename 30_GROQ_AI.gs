/***************************************************************
 * Archivo: 30_GROQ_AI.gs
 * Groq optimizado: candidatos locales + JSON estricto + fallback.
 ***************************************************************/

function CFX_aiClassifyMessage(message, state, candidates) {
  var cfg = CFX_getIaConfig();
  if (!cfg.enabled || cfg.mode === 'OFF') {
    return { ok: false, skipped: true, reason: 'IA_OFF' };
  }
  if (!cfg.apiKey) {
    return { ok: false, skipped: true, reason: 'GROQ_API_KEY_NO_CONFIGURADA' };
  }

  candidates = (candidates || []).slice(0, cfg.maxCandidates);
  var id = CFX_nextId(CFX_SHEETS.IA_LOG, 1, 'IA');
  var compactCandidates = CFX_compactCandidatesForAI(candidates);
  var promptObj = {
    mensaje_cliente: CFX_clean(message),
    estado_conversacion: {
      estado_actual: state && state.estadoActual ? state.estadoActual : '',
      intencion_previa: state && state.intencionPrevia ? state.intencionPrevia : '',
      carrito_actual: state && state.cart ? state.cart.map(function(p) { return { sku: p.sku, nombre: p.nombre, cantidad: p.cantidad }; }) : [],
      ultima_cotizacion_id: state && state.ultimaCotizacionId ? state.ultimaCotizacionId : ''
    },
    candidatos_catalogo: compactCandidates,
    reglas: [
      'Usa SOLO productos presentes en candidatos_catalogo.',
      'No inventes productos, precios, stock, promociones ni entrega.',
      'Si el producto pedido no está claramente en candidatos_catalogo, selected_skus=[] y not_in_catalog=true.',
      'No selecciones accesorios ni relacionados salvo que el cliente los pida explícitamente.',
      'Si el cliente confirma sí/ok/dale y existe carrito_actual, intent=CONFIRMACION.',
      'Si pregunta por pago/cuenta/transferencia, intent=PAGO.',
      'Si pide asesor/persona/humano, intent=DERIVAR_ASESOR.',
      'Devuelve JSON válido. No markdown. No explicación larga.'
    ],
    schema_obligatorio: {
      intent: 'SALUDO|CONSULTA_PRODUCTO|COTIZACION_PROBABLE|COTIZACION_PDF|CONFIRMACION|PAGO|UBICACION|HORARIO|PREGUNTA_BOT|DERIVAR_ASESOR|SIN_PRODUCTO',
      selected_skus: ['SKU exactos de candidatos_catalogo'],
      qty_by_sku: { 'SKU': 1 },
      not_in_catalog: true,
      wants_price: true,
      wants_stock: true,
      wants_pdf: true,
      confirmation: true,
      needs_human: false,
      confidence: 0.0,
      answer_strategy: 'RESPONDER_PRODUCTO|PREGUNTAR_ACLARACION|GENERAR_PDF|ENVIAR_PAGO|DERIVAR_ASESOR',
      brief_reason: 'máximo 12 palabras, sin cadena de pensamiento'
    }
  };

  var system = [
    'Eres el clasificador comercial de CotiFlash.',
    'Tu trabajo es interpretar mensajes de WhatsApp para vender con precisión.',
    'Piensa internamente, valida contra catálogo, y devuelve SOLO JSON.',
    'La respuesta final al cliente NO la escribes tú; solo clasificas.',
    'Prohibido inventar productos, precios, stock, descuentos, entrega o datos del negocio.'
  ].join(' ');

  var payload = {
    model: cfg.model || CFX.DEFAULT_GROQ_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(promptObj) }
    ],
    temperature: cfg.temperature,
    max_completion_tokens: cfg.maxOutputTokens,
    top_p: 1,
    stream: false,
    response_format: { type: 'json_object' }
  };

  var logPrompt = cfg.logPrompts ? JSON.stringify(promptObj) : '[PROMPT_OCULTO] candidatos=' + compactCandidates.length;
  try {
    var res = UrlFetchApp.fetch(CFX.GROQ_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + cfg.apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      timeout: cfg.timeoutMs
    });

    var code = res.getResponseCode();
    var body = res.getContentText();
    if (code === 429) {
      CFX_append(CFX_SHEETS.IA_LOG, [id, CFX_now(), 'CLASSIFY', CFX_truncate(message, 500), logPrompt, '', 'RATE_LIMIT', CFX_truncate(body, 1000), '', '']);
      return { ok: false, error: 'GROQ_RATE_LIMIT', raw: body };
    }
    if (code < 200 || code >= 300) {
      CFX_append(CFX_SHEETS.IA_LOG, [id, CFX_now(), 'CLASSIFY', CFX_truncate(message, 500), logPrompt, '', 'HTTP_ERROR_' + code, CFX_truncate(body, 1000), '', '']);
      return { ok: false, error: 'GROQ_HTTP_' + code, raw: body };
    }

    var parsed = JSON.parse(body);
    var content = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message ? parsed.choices[0].message.content : '';
    var obj = CFX_extractJson(content);
    if (!obj) throw new Error('Groq no devolvió JSON parseable: ' + content);

    obj = CFX_validateAiResult(obj, candidates);
    obj.ok = true;
    obj.provider = 'GROQ';
    obj.model = cfg.model;

    var usage = parsed.usage || {};
    CFX_append(CFX_SHEETS.IA_LOG, [
      id, CFX_now(), 'CLASSIFY', CFX_truncate(message, 500), logPrompt,
      CFX_truncate(JSON.stringify(obj), 1400), 'OK', '',
      usage.prompt_tokens || '', usage.completion_tokens || ''
    ]);
    return obj;
  } catch (err) {
    CFX_error('CFX_aiClassifyMessage', err, { message: message, candidates: compactCandidates });
    CFX_append(CFX_SHEETS.IA_LOG, [id, CFX_now(), 'CLASSIFY', CFX_truncate(message, 500), logPrompt, '', 'ERROR', CFX_safeStack(err), '', '']);
    return { ok: false, error: err.message };
  }
}

function CFX_compactCandidatesForAI(candidates) {
  candidates = candidates || [];
  return candidates.map(function(p) {
    return {
      sku: p.sku,
      nombre: p.nombre,
      categoria: p.categoria,
      tipo: p.tipo,
      keywords: p.keywords || '',
      match_type: p.matchType || '',
      score_local: p.score || 0
    };
  });
}

function CFX_validateAiResult(obj, candidates) {
  var allowedIntents = {};
  var keys = Object.keys(CFX_INTENTS);
  for (var i = 0; i < keys.length; i++) allowedIntents[CFX_INTENTS[keys[i]]] = true;

  var candidateMap = {};
  for (var c = 0; c < (candidates || []).length; c++) candidateMap[candidates[c].sku] = true;

  var out = {
    intent: allowedIntents[obj.intent] ? obj.intent : CFX_INTENTS.CONSULTA_PRODUCTO,
    selected_skus: [],
    qty_by_sku: {},
    not_in_catalog: obj.not_in_catalog === true,
    wants_price: obj.wants_price === true,
    wants_stock: obj.wants_stock === true,
    wants_pdf: obj.wants_pdf === true,
    confirmation: obj.confirmation === true,
    needs_human: obj.needs_human === true,
    confidence: Math.max(0, Math.min(1, CFX_num(obj.confidence))),
    answer_strategy: CFX_clean(obj.answer_strategy || ''),
    brief_reason: CFX_truncate(obj.brief_reason || '', 120)
  };

  var skus = obj.selected_skus || obj.candidate_skus || [];
  if (!Array.isArray(skus)) skus = [];
  for (var s = 0; s < skus.length; s++) {
    var sku = CFX_clean(skus[s]);
    if (candidateMap[sku] && out.selected_skus.indexOf(sku) < 0) out.selected_skus.push(sku);
  }

  var qtyMap = obj.qty_by_sku || {};
  for (var q = 0; q < out.selected_skus.length; q++) {
    var k = out.selected_skus[q];
    out.qty_by_sku[k] = Math.max(1, CFX_num(qtyMap[k] || 1));
  }

  if (out.selected_skus.length > 0) out.not_in_catalog = false;
  if (out.confirmation) out.intent = CFX_INTENTS.CONFIRMACION;
  if (out.needs_human) out.intent = CFX_INTENTS.DERIVAR_ASESOR;
  if (out.wants_pdf && out.selected_skus.length > 0) out.intent = CFX_INTENTS.COTIZACION_PDF;
  return out;
}
