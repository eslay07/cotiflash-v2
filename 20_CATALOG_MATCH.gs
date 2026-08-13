/***************************************************************
 * Archivo: 20_CATALOG_MATCH.gs
 * Catálogo y motor estricto de coincidencias.
 ***************************************************************/

function CFX_getProductsRaw(activeOnly) {
  var sh = CFX_sheet(CFX_SHEETS.PRODUCTS);
  var last = sh.getLastRow();
  var out = [];
  if (last < 2) return out;
  var vals = sh.getRange(2, 1, last - 1, CFX_HEADERS[CFX_SHEETS.PRODUCTS].length).getValues();
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    var p = {
      sku: CFX_clean(r[0]),
      nombre: CFX_clean(r[1]),
      categoria: CFX_clean(r[2]),
      tipo: CFX_clean(r[3] || 'PRODUCTO').toUpperCase(),
      keywords: CFX_clean(r[4]),
      alias: CFX_clean(r[5]),
      relacionados: CFX_clean(r[6]),
      costo: CFX_num(r[7]),
      precio: CFX_num(r[8]),
      stock: CFX_num(r[9]),
      stockMin: CFX_num(r[10]),
      estado: CFX_clean(r[11] || 'ACTIVO').toUpperCase(),
      respuestaBase: CFX_clean(r[12]),
      requiereConfirmarStock: CFX_clean(r[13] || 'NO').toUpperCase(),
      mensajeSinStock: CFX_clean(r[14]),
      row: i + 2
    };
    if (!p.sku || !p.nombre) continue;
    if (activeOnly && p.estado !== 'ACTIVO') continue;
    out.push(p);
  }
  return out;
}

function CFX_productMap() {
  var list = CFX_getProductsRaw(true);
  var map = {};
  for (var i = 0; i < list.length; i++) map[list[i].sku] = list[i];
  return map;
}

function CFX_getProductsBySkus(skus, qtyMap) {
  var map = CFX_productMap();
  var out = [];
  var seen = {};
  skus = skus || [];
  qtyMap = qtyMap || {};
  for (var i = 0; i < skus.length; i++) {
    var sku = CFX_clean(skus[i]);
    if (!sku || seen[sku] || !map[sku]) continue;
    var p = CFX_copyProductForCart(map[sku]);
    p.cantidad = Math.max(1, CFX_num(qtyMap[sku] || 1));
    p.matchType = 'IA_SKU';
    p.score = 999;
    out.push(p);
    seen[sku] = true;
  }
  return out;
}

function CFX_copyProductForCart(p) {
  return {
    sku: p.sku,
    nombre: p.nombre,
    categoria: p.categoria,
    tipo: p.tipo,
    precio: p.precio,
    stock: p.stock,
    stockMin: p.stockMin,
    cantidad: 1,
    relacionados: p.relacionados,
    respuestaBase: p.respuestaBase,
    requiereConfirmarStock: p.requiereConfirmarStock,
    mensajeSinStock: p.mensajeSinStock
  };
}

function CFX_searchProductCandidates(message, limit) {
  limit = limit || 8;
  var msg = CFX_norm(message);
  var tokens = CFX_meaningfulTokens(msg);
  var products = CFX_getProductsRaw(true);
  var scored = [];

  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var s = CFX_scoreProduct(msg, tokens, p);
    if (s.score >= 50 && s.strong) {
      var c = CFX_copyProductForCart(p);
      c.score = s.score;
      c.matchType = s.matchType;
      c.matchReason = s.reasons.join(', ');
      c.cantidad = CFX_detectQtyForProduct(msg, p);
      scored.push(c);
    }
  }

  scored.sort(function(a, b) { return b.score - a.score; });
  if (!scored.length) return [];

  var top = scored[0].score;
  var min = Math.max(50, top * 0.70);
  var out = [];
  var seen = {};
  for (var j = 0; j < scored.length; j++) {
    if (scored[j].score < min) continue;
    if (seen[scored[j].sku]) continue;
    seen[scored[j].sku] = true;
    out.push(scored[j]);
    if (out.length >= limit) break;
  }

  return CFX_sanitizeCandidatesByRequest(message, out);
}

function CFX_scoreProduct(msg, tokens, p) {
  var score = 0;
  var reasons = [];
  var strong = false;
  var matchType = 'NONE';

  var name = CFX_norm(p.nombre);
  var cat = CFX_norm(p.categoria);
  var sku = CFX_norm(p.sku);
  var aliases = CFX_splitTerms(p.alias);
  var keywords = CFX_splitTerms(p.keywords);
  var nameTokens = name.split(' ').filter(function(w) { return w.length >= 3; });

  if (sku && msg.indexOf(sku) >= 0) {
    score += 200; strong = true; matchType = 'SKU'; reasons.push('sku');
  }

  if (name && msg.indexOf(name) >= 0) {
    score += 180; strong = true; matchType = 'NOMBRE_EXACTO'; reasons.push('nombre exacto');
  }

  for (var a = 0; a < aliases.length; a++) {
    var al = CFX_norm(aliases[a]);
    if (!al) continue;
    if (msg.indexOf(al) >= 0) {
      score += al.indexOf(' ') >= 0 ? 120 : 75;
      strong = true;
      if (matchType === 'NONE') matchType = 'ALIAS';
      reasons.push('alias ' + al);
    }
  }

  var nameHits = 0;
  for (var i = 0; i < nameTokens.length; i++) {
    var nt = nameTokens[i];
    if (msg.indexOf(nt) >= 0) {
      nameHits++;
      score += 35;
      strong = true;
      if (matchType === 'NONE') matchType = 'NOMBRE_PARCIAL';
      reasons.push('nombre token ' + nt);
    }
  }

  // Si el mensaje tiene una sola palabra útil, solo aceptamos coincidencia en nombre/categoría/alias, no keyword débil.
  if (tokens.length === 1) {
    var only = tokens[0];
    var aliasHit = CFX_norm(p.alias).indexOf(only) >= 0;
    if (name.indexOf(only) >= 0 || cat.indexOf(only) >= 0 || aliasHit) {
      score += 80;
      strong = true;
      if (matchType === 'NONE') matchType = 'TOKEN_UNICO_FUERTE';
      reasons.push('token único fuerte');
    }
  }

  for (var k = 0; k < keywords.length; k++) {
    var kw = CFX_norm(keywords[k]);
    if (!kw) continue;
    if (msg.indexOf(kw) >= 0) {
      if (kw.indexOf(' ') >= 0) {
        score += 70;
        strong = true;
        if (matchType === 'NONE') matchType = 'KEYWORD_FRASE';
        reasons.push('keyword frase ' + kw);
      } else {
        // Ayuda, pero sola NO debe disparar producto.
        score += 12;
        reasons.push('keyword simple ' + kw);
      }
    }
  }

  if (cat && msg.indexOf(cat) >= 0) {
    score += 25;
    strong = true;
    if (matchType === 'NONE') matchType = 'CATEGORIA';
    reasons.push('categoria');
  }

  // Penalización para accesorios no pedidos explícitamente.
  var accessoryWords = ['adaptador','convertidor','pad','base','soporte','cargador','funda','protector'];
  for (var z = 0; z < accessoryWords.length; z++) {
    var aw = accessoryWords[z];
    if (name.indexOf(aw) >= 0 && msg.indexOf(aw) < 0) score -= 45;
  }

  // Si el usuario pide categoría/producto claro, no metas productos con tokens genéricos de comida/uso.
  if (msg.indexOf('comida de perro') >= 0 && name.indexOf('comida de perro') < 0 && cat.indexOf('masc') < 0) score -= 120;
  if (msg.indexOf('leche') >= 0 && name.indexOf('leche') < 0 && cat.indexOf('lact') < 0) score -= 160;
  if (msg.indexOf('computadora') >= 0 && name.indexOf('computadora') < 0 && name.indexOf('laptop') < 0) score -= 120;
  if (msg.indexOf('cable') >= 0 && name.indexOf('cable') < 0 && CFX_norm(p.alias).indexOf('cable') < 0) score -= 60;

  if (nameHits >= 2) {
    score += 40;
    strong = true;
  }

  if (score < 0) score = 0;
  return { score: score, strong: strong && score >= 50, reasons: CFX_unique(reasons), matchType: matchType };
}

function CFX_sanitizeCandidatesByRequest(message, candidates) {
  candidates = candidates || [];
  if (!candidates.length) return [];
  var tokens = CFX_meaningfulTokens(message);

  if (tokens.length === 1) {
    var t = tokens[0];
    var filtered = [];
    for (var i = 0; i < candidates.length; i++) {
      var name = CFX_norm(candidates[i].nombre);
      var cat = CFX_norm(candidates[i].categoria);
      var alias = CFX_norm(candidates[i].alias || '');
      if (name.indexOf(t) >= 0 || cat.indexOf(t) >= 0 || alias.indexOf(t) >= 0) filtered.push(candidates[i]);
    }
    return filtered;
  }

  return candidates;
}

function CFX_splitTerms(text) {
  var s = CFX_clean(text);
  if (!s) return [];
  return s.split(/[,\n;]/).map(function(x) { return CFX_clean(x); }).filter(function(x) { return x; });
}

function CFX_detectQtyForProduct(msgNorm, product) {
  var nameTokens = CFX_norm(product.nombre).split(' ').filter(function(w) { return w.length >= 3; });
  var main = nameTokens.length ? nameTokens[0] : '';
  var qty = 1;

  var patterns = [
    /(?:necesito|quiero|deme|dame|comprar|compro)?\s*(\d+)\s*(?:x|unidades|unidad|unds|u)?\s*([a-z0-9]+)/i,
    /([a-z0-9]+)\s*(?:x)?\s*(\d+)/i
  ];

  for (var i = 0; i < patterns.length; i++) {
    var m = msgNorm.match(patterns[i]);
    if (!m) continue;
    if (i === 0 && main && CFX_norm(m[2]).indexOf(main) >= 0) qty = CFX_num(m[1]);
    if (i === 1 && main && CFX_norm(m[1]).indexOf(main) >= 0) qty = CFX_num(m[2]);
  }

  if (qty <= 0) qty = 1;
  return qty;
}

function CFX_getRelatedProducts(mainProducts, limit) {
  limit = limit || 3;
  var map = CFX_productMap();
  var seen = {};
  var out = [];
  mainProducts = mainProducts || [];

  for (var i = 0; i < mainProducts.length; i++) seen[mainProducts[i].sku] = true;

  for (var j = 0; j < mainProducts.length; j++) {
    var rel = CFX_splitTerms(mainProducts[j].relacionados);
    for (var r = 0; r < rel.length; r++) {
      var sku = CFX_clean(rel[r]);
      if (seen[sku] || !map[sku]) continue;
      var p = CFX_copyProductForCart(map[sku]);
      p.cantidad = 1;
      p.tipoItem = 'SUGERIDO';
      out.push(p);
      seen[sku] = true;
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function CFX_importCatalogText(text) {
  var lines = CFX_clean(text).split(/\r?\n/).filter(function(x) { return CFX_clean(x); });
  if (!lines.length) return { created: 0, updated: 0, errors: [] };

  var delimiter = lines[0].indexOf('\t') >= 0 ? '\t' : ',';
  var first = CFX_parseCsvLine(lines[0], delimiter);
  var hasHeader = CFX_norm(first.join(' ')).indexOf('nombre') >= 0 || CFX_norm(first.join(' ')).indexOf('producto') >= 0;
  var headers = hasHeader ? first.map(function(h) { return CFX_norm(h).replace(/\s+/g, '_'); }) :
    ['nombre','precio','stock','keywords','categoria','costo','stock_min','tipo','alias','relacionados_sku','sku'];
  var start = hasHeader ? 1 : 0;

  var created = 0, updated = 0, errors = [];
  for (var i = start; i < lines.length; i++) {
    try {
      var parts = CFX_parseCsvLine(lines[i], delimiter);
      var obj = {};
      for (var j = 0; j < headers.length; j++) obj[headers[j]] = CFX_clean(parts[j]);

      var p = {
        sku: obj.sku || '',
        nombre: obj.nombre || obj.producto || obj.producto_servicio || '',
        categoria: obj.categoria || 'GENERAL',
        tipo: obj.tipo || 'PRODUCTO',
        keywords: obj.keywords || obj.palabras_clave || '',
        alias: obj.alias || obj.aliases || '',
        relacionados: obj.relacionados_sku || obj.relacionados || '',
        costo: obj.costo || 0,
        precio: obj.precio || obj.precio_venta || obj.valor || 0,
        stock: obj.stock || obj.stock_actual || obj.stock_inicial || 0,
        stockMin: obj.stock_min || obj.stock_minimo || 0,
        respuestaBase: obj.respuesta_base || obj.respuesta || 'Disponible para cotización.',
        requiereConfirmarStock: obj.requiere_confirmar_stock || 'NO',
        mensajeSinStock: obj.mensaje_sin_stock || 'Producto sin stock por confirmar.'
      };

      if (!p.nombre || CFX_num(p.precio) < 0) throw new Error('Falta nombre o precio inválido');
      var wasUpdate = CFX_upsertProduct(p);
      if (wasUpdate) updated++; else created++;
    } catch (err) {
      errors.push('Fila ' + (i + 1) + ': ' + err.message);
    }
  }
  CFX_log('CATALOG_IMPORT', 'created=' + created + ' updated=' + updated, { errors: errors });
  return { created: created, updated: updated, errors: errors };
}

function CFX_upsertProduct(p) {
  var sh = CFX_sheet(CFX_SHEETS.PRODUCTS);
  var products = CFX_getProductsRaw(false);
  var row = 0;
  var sku = CFX_clean(p.sku);
  var nameNorm = CFX_norm(p.nombre);
  for (var i = 0; i < products.length; i++) {
    if ((sku && products[i].sku === sku) || CFX_norm(products[i].nombre) === nameNorm) {
      row = products[i].row;
      if (!sku) sku = products[i].sku;
      break;
    }
  }

  if (!sku) sku = CFX_nextId(CFX_SHEETS.PRODUCTS, 1, String(p.tipo).toUpperCase() === 'SERVICIO' ? 'SER' : 'SKU');

  var rowData = [
    sku, p.nombre, p.categoria || 'GENERAL', (p.tipo || 'PRODUCTO').toUpperCase(),
    p.keywords || CFX_autoKeywords(p.nombre), p.alias || '', p.relacionados || '',
    CFX_num(p.costo), CFX_num(p.precio), CFX_num(p.stock), CFX_num(p.stockMin),
    'ACTIVO', p.respuestaBase || 'Disponible para cotización.',
    p.requiereConfirmarStock || 'NO', p.mensajeSinStock || 'Producto sin stock por confirmar.',
    CFX_now()
  ];

  if (row) sh.getRange(row, 1, 1, rowData.length).setValues([rowData]);
  else sh.appendRow(rowData);
  return !!row;
}

function CFX_autoKeywords(name) {
  return CFX_meaningfulTokens(name).join(',');
}

function CFX_parseCsvLine(line, delimiter) {
  if (delimiter === '\t') return line.split('\t');
  var out = [], cur = '', q = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line.charAt(i);
    if (ch === '"') {
      if (q && line.charAt(i + 1) === '"') { cur += '"'; i++; }
      else q = !q;
      continue;
    }
    if (ch === ',' && !q) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}
