/***************************************************************
 * Archivo: 32_ROUTER.gs
 * Router principal: decide respuesta final con reglas + Groq.
 ***************************************************************/

function CFX_handleIncomingMessage(waId, profileName, text, messageId) {
  CFX_setupSheets();
  waId = CFX_waNormalize(waId);
  profileName = CFX_clean(profileName) || 'buen día';
  text = CFX_clean(text);

  if (messageId && CFX_isDuplicateMessage(messageId)) {
    CFX_log('DUPLICATE_MESSAGE', messageId, { waId: waId });
    return { shouldReply: false, text: '', duplicate: true };
  }

  CFX_upsertClient(waId, profileName);

  var state = CFX_getState(waId);
  var heat = CFX_detectHeat(text);
  var localCandidates = CFX_searchProductCandidates(text, CFX_num(CFX_getConfig('IA_MAX_CANDIDATOS', 8)));
  var ai = CFX_aiClassifyMessage(text, state, localCandidates);
  var decision = CFX_decideResponse(waId, profileName, text, state, heat, localCandidates, ai);

  var productsText = (decision.cart || []).map(function(p) { return p.sku + ' ' + p.nombre + ' x' + (p.cantidad || 1); }).join(' | ');
  CFX_recordConversation({
    waId: waId,
    name: profileName,
    inbound: text,
    outbound: decision.text,
    intent: decision.intent,
    heat: heat.calor,
    score: heat.score,
    productsText: productsText,
    messageId: messageId || '',
    engine: decision.engine,
    status: decision.status,
    error: decision.error || ''
  });

  if (decision.stateAction === 'SET') {
    CFX_setState(waId, profileName, decision.nextState, decision.intent, decision.cart || [], decision.quoteId || state.ultimaCotizacionId || '', text, decision.text, decision.notes || '');
  } else if (decision.stateAction === 'CLEAR') {
    CFX_clearState(waId, profileName, decision.notes || '');
  }

  var waCfg = CFX_getWhatsAppConfig();
  return { shouldReply: waCfg.autoReply, text: decision.text, decision: decision };
}

function CFX_decideResponse(waId, name, text, state, heat, localCandidates, ai) {
  var cfg = CFX_getConfigMap();
  var n = CFX_norm(text);
  var engine = ai && ai.ok ? 'GROQ' : 'REGLAS';

  if (!text || text.length <= 1) {
    return CFX_decision('Hola ' + name + ', ¿qué producto o servicio desea cotizar? ' + (cfg.FIRMA_MENSAJES || ''), CFX_INTENTS.SALUDO, engine, CFX_STATE.ESPERANDO_PRODUCTO, [], 'SET', 'MENSAJE_CORTO');
  }

  if (CFX_wantsHuman(text) || (ai && ai.ok && ai.intent === CFX_INTENTS.DERIVAR_ASESOR)) {
    return CFX_decision('Claro, le paso la consulta a un asesor. Por favor déjenos cualquier detalle adicional. ' + (cfg.FIRMA_MENSAJES || ''), CFX_INTENTS.DERIVAR_ASESOR, engine, CFX_STATE.DERIVADO_ASESOR, [], 'SET', 'DERIVAR_ASESOR');
  }

  if (CFX_asksPayment(text) || (ai && ai.ok && ai.intent === CFX_INTENTS.PAGO)) {
    var pay = CFX_buildPaymentMessage(name);
    return CFX_decision(pay, CFX_INTENTS.PAGO, engine, CFX_STATE.ESPERANDO_PAGO, state.cart || [], 'SET', 'PAGO');
  }

  if ((CFX_isConfirmation(text) || (ai && ai.ok && ai.confirmation)) && state && state.estadoActual === CFX_STATE.ESPERANDO_CONFIRMACION_PDF && state.cart && state.cart.length) {
    var q1 = CFX_createQuote(waId, name, state.ultimoMensaje || text, state.cart, heat, 'Confirmación posterior');
    var msg1 = 'Perfecto, le generé la cotización formal en PDF:\n' + q1.pdfUrl + '\n\n' + CFX_buildPaymentSoftHint() + '\n\n' + (cfg.FIRMA_MENSAJES || '');
    return CFX_decision(msg1, CFX_INTENTS.COTIZACION_PDF, engine, CFX_STATE.CERRADO, state.cart, 'CLEAR', 'PDF_CONFIRMADO', q1.id);
  }

  if (CFX_isGreeting(text) && (!localCandidates || !localCandidates.length)) {
    return CFX_decision('Hola ' + name + ', gracias por escribirnos. ¿Qué producto o servicio desea cotizar? ' + (cfg.FIRMA_MENSAJES || ''), CFX_INTENTS.SALUDO, engine, CFX_STATE.ESPERANDO_PRODUCTO, [], 'SET', 'SALUDO');
  }

  if (CFX_asksLocation(text) || (ai && ai.ok && ai.intent === CFX_INTENTS.UBICACION)) {
    var loc = 'Estamos en ' + (cfg.CIUDAD || 'la ciudad') + '. Dirección: ' + (cfg.DIRECCION_NEGOCIO || 'por confirmar') + '. ' + (cfg.FIRMA_MENSAJES || '');
    return CFX_decision(loc, CFX_INTENTS.UBICACION, engine, CFX_STATE.NUEVO, state.cart || [], 'SET', 'UBICACION');
  }

  if (CFX_asksHours(text) || (ai && ai.ok && ai.intent === CFX_INTENTS.HORARIO)) {
    var h = 'Gracias por escribirnos. Nuestro equipo confirmará el horario de atención disponible. ' + (cfg.FIRMA_MENSAJES || '');
    return CFX_decision(h, CFX_INTENTS.HORARIO, engine, CFX_STATE.NUEVO, state.cart || [], 'SET', 'HORARIO');
  }

  var selected = CFX_selectProductsFromEngines(text, localCandidates, ai);
  if (!selected.length) {
    var miss = CFX_clean(cfg.MENSAJE_SIN_PRODUCTO) || 'Por ahora no tengo ese producto registrado con claridad. ¿Me indica el nombre exacto, marca/modelo o desea asesor?';
    return CFX_decision(miss + '\n\n' + (cfg.FIRMA_MENSAJES || ''), CFX_INTENTS.SIN_PRODUCTO, engine, CFX_STATE.ESPERANDO_PRODUCTO, [], 'SET', 'SIN_PRODUCTO' + (ai && ai.error ? '|' + ai.error : ''));
  }

  var wantsPdf = CFX_wantsPdf(text) || (ai && ai.ok && ai.wants_pdf);
  if (wantsPdf) {
    var q2 = CFX_createQuote(waId, name, text, selected, heat, 'Pedido directo');
    var msg2 = CFX_buildProductSummary(name, selected, q2.pdfUrl, true) + '\n\n' + CFX_buildPaymentSoftHint() + '\n\n' + (cfg.FIRMA_MENSAJES || '');
    return CFX_decision(msg2, CFX_INTENTS.COTIZACION_PDF, engine, CFX_STATE.CERRADO, selected, 'CLEAR', 'PDF_GENERADO', q2.id);
  }

  var response = CFX_buildProductSummary(name, selected, '', false);
  var upsells = CFX_getRelatedProducts(selected, 3);
  if (upsells.length) {
    response += '\n\nTambién podría servirle:';
    for (var u = 0; u < upsells.length; u++) {
      response += '\n➕ ' + upsells[u].nombre + ': $' + CFX_money(upsells[u].precio);
    }
  }
  response += '\n\n¿Desea que le genere una cotización formal en PDF?\n\n' + (cfg.FIRMA_MENSAJES || '');
  return CFX_decision(response, CFX_INTENTS.CONSULTA_PRODUCTO, engine, CFX_STATE.ESPERANDO_CONFIRMACION_PDF, selected, 'SET', 'ESPERA_CONFIRMACION_PDF');
}

function CFX_selectProductsFromEngines(text, localCandidates, ai) {
  if (ai && ai.ok && ai.selected_skus && ai.selected_skus.length && ai.not_in_catalog !== true) {
    return CFX_getProductsBySkus(ai.selected_skus, ai.qty_by_sku || {});
  }
  if (ai && ai.ok && ai.not_in_catalog === true) return [];
  return localCandidates || [];
}

function CFX_decision(text, intent, engine, nextState, cart, stateAction, status, quoteId) {
  return {
    text: CFX_clean(text),
    intent: intent,
    engine: engine,
    nextState: nextState,
    cart: cart || [],
    stateAction: stateAction || 'SET',
    status: status || 'OK',
    quoteId: quoteId || '',
    notes: status || ''
  };
}

function CFX_buildProductSummary(name, products, pdfUrl, generatedPdf) {
  var total = 0;
  var lines = [];
  products = products || [];
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var qty = Math.max(1, CFX_num(p.cantidad || 1));
    var line = qty * CFX_num(p.precio);
    total += line;
    var stockText = p.tipo === 'SERVICIO' ? 'servicio disponible' : ('stock: ' + p.stock);
    if (p.stock <= 0 && p.tipo !== 'SERVICIO') stockText = p.mensajeSinStock || 'stock por confirmar';
    lines.push('✅ ' + p.nombre + ' x' + qty + ': $' + CFX_money(line) + ' (' + stockText + ')');
  }
  var txt = 'Hola ' + name + ', según su consulta tenemos:\n\n' + lines.join('\n') + '\n\nTotal referencial: $' + CFX_money(total);
  if (generatedPdf && pdfUrl) txt += '\n\nCotización formal PDF: ' + pdfUrl;
  return txt;
}

function CFX_buildPaymentSoftHint() {
  var mode = CFX_clean(CFX_getConfig('PAGO_MODO', 'NO_CONFIGURADO'));
  if (mode === 'NO_CONFIGURADO') return '';
  return 'Si desea continuar, puede escribir "pago" y le envío los datos.';
}

function CFX_buildPaymentMessage(name) {
  var c = CFX_getConfigMap();
  var mode = CFX_clean(c.PAGO_MODO || 'NO_CONFIGURADO').toUpperCase();
  if (mode === 'NO_CONFIGURADO') {
    return 'Hola ' + name + ', un asesor le confirmará los datos de pago. ' + (c.FIRMA_MENSAJES || '');
  }
  var lines = ['Hola ' + name + ', puede realizar el pago con estos datos:'];
  if (mode === 'TRANSFERENCIA' || mode === 'MIXTO') {
    lines.push('Banco: ' + (c.PAGO_BANCO || 'por confirmar'));
    lines.push('Tipo de cuenta: ' + (c.PAGO_TIPO_CUENTA || 'por confirmar'));
    lines.push('Número de cuenta: ' + (c.PAGO_NUMERO_CUENTA || 'por confirmar'));
    lines.push('Titular: ' + (c.PAGO_TITULAR || 'por confirmar'));
    if (c.PAGO_RUC_CI) lines.push('RUC/CI: ' + c.PAGO_RUC_CI);
  }
  if ((mode === 'LINK' || mode === 'MIXTO') && c.PAGO_LINK_GENERAL) {
    lines.push('Link de pago: ' + c.PAGO_LINK_GENERAL);
  }
  if (c.PAGO_INSTRUCCIONES_EXTRA) lines.push(c.PAGO_INSTRUCCIONES_EXTRA);
  lines.push(c.FIRMA_MENSAJES || '');
  return lines.join('\n');
}
