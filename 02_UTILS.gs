/***************************************************************
 * Archivo: 02_UTILS.gs
 ***************************************************************/

function CFX_now() {
  return Utilities.formatDate(new Date(), CFX.TZ, 'yyyy-MM-dd HH:mm:ss');
}

function CFX_datePlusDays(days) {
  var d = new Date();
  d.setDate(d.getDate() + CFX_num(days));
  return Utilities.formatDate(d, CFX.TZ, 'yyyy-MM-dd HH:mm:ss');
}

function CFX_clean(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function CFX_truncate(v, max) {
  var s = CFX_clean(v);
  max = max || CFX.MAX_LOG_CHARS;
  return s.length > max ? s.substring(0, max) + '...[TRUNCATED]' : s;
}

function CFX_norm(v) {
  var s = CFX_clean(v).toLowerCase();
  try {
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (err) {}
  s = s.replace(/[^\w\s$.,-]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function CFX_num(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  var s = String(v).replace(',', '.').replace(/[^\d.-]/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function CFX_bool(v) {
  var s = CFX_norm(v);
  return s === 'si' || s === 'sí' || s === 'true' || s === '1' || s === 'on';
}

function CFX_money(v) {
  return CFX_num(v).toFixed(2);
}

function CFX_jsonParseSafe(text, fallback) {
  try { return JSON.parse(CFX_clean(text)); } catch (err) { return fallback; }
}

function CFX_jsonStringify(obj) {
  try { return JSON.stringify(obj); } catch (err) { return '{}'; }
}

function CFX_jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function CFX_textOut(text) {
  return ContentService.createTextOutput(CFX_clean(text)).setMimeType(ContentService.MimeType.TEXT);
}

function CFX_nextId(sheetName, colIndex, prefix) {
  var sh = CFX_sheet(sheetName);
  var last = sh.getLastRow();
  var max = 0;
  if (last >= 2) {
    var vals = sh.getRange(2, colIndex || 1, last - 1, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      var m = CFX_clean(vals[i][0]).match(/(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  }
  return prefix + '-' + Utilities.formatString('%04d', max + 1);
}

function CFX_uuid(prefix) {
  return (prefix || 'ID') + '-' + Utilities.getUuid().substring(0, 8).toUpperCase();
}

function CFX_meaningfulTokens(text) {
  var stop = {
    'hola':1,'buenas':1,'buenos':1,'buen':1,'dia':1,'dias':1,'tardes':1,'noches':1,'veci':1,'vecino':1,'amigo':1,
    'tiene':1,'tienen':1,'hay':1,'precio':1,'cuanto':1,'cuánto':1,'vale':1,'costo':1,'valor':1,'sale':1,
    'necesito':1,'quiero':1,'quisiera':1,'deme':1,'dame':1,'por':1,'favor':1,'para':1,'con':1,'sin':1,
    'de':1,'del':1,'la':1,'el':1,'los':1,'las':1,'un':1,'una':1,'unos':1,'unas':1,'y':1,'o':1,'en':1,'a':1,
    'me':1,'puede':1,'puedes':1,'podria':1,'podrías':1,'seria':1,'sería':1,'es':1,'son':1,
    'cotizacion':1,'cotización':1,'cotizar':1,'pdf':1,'stock':1,'disponible':1,'disponibilidad':1
  };
  var arr = CFX_norm(text).split(' ');
  var out = [];
  var seen = {};
  for (var i = 0; i < arr.length; i++) {
    var w = arr[i];
    if (!w || w.length < 3 || stop[w]) continue;
    if (!seen[w]) {
      seen[w] = true;
      out.push(w);
    }
  }
  return out;
}

function CFX_unique(arr) {
  var seen = {}, out = [];
  arr = arr || [];
  for (var i = 0; i < arr.length; i++) {
    var k = CFX_clean(arr[i]);
    if (!k || seen[k]) continue;
    seen[k] = true;
    out.push(arr[i]);
  }
  return out;
}

function CFX_extractJson(text) {
  var s = CFX_clean(text);
  if (!s) return null;
  try { return JSON.parse(s); } catch (e1) {}
  var start = s.indexOf('{');
  var end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    var sub = s.substring(start, end + 1);
    try { return JSON.parse(sub); } catch (e2) {}
  }
  return null;
}

function CFX_waNormalize(phone) {
  var s = CFX_clean(phone).replace(/[^\d]/g, '');
  if (!s) return '';
  if (s.indexOf('00') === 0) s = s.substring(2);
  if (s.length === 10 && s.charAt(0) === '0') s = '593' + s.substring(1);
  if (s.length === 9 && s.charAt(0) === '9') s = '593' + s;
  return s;
}

function CFX_waLink(phone, message) {
  return 'https://wa.me/' + encodeURIComponent(CFX_waNormalize(phone)) + '?text=' + encodeURIComponent(CFX_clean(message));
}

function CFX_isGreeting(text) {
  var n = CFX_norm(text);
  return /^(hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hi|hello)(\s|$)/.test(n);
}

function CFX_isConfirmation(text) {
  var n = CFX_norm(text);
  return /^(si|sí|ok|okay|dale|correcto|confirmo|afirmativo|de una|hazlo|generalo|genéralo|mandelo|mándelo)(\s|$|[.!])/.test(n);
}

function CFX_wantsHuman(text) {
  var n = CFX_norm(text);
  return n.indexOf('asesor') >= 0 || n.indexOf('persona') >= 0 || n.indexOf('humano') >= 0 || n.indexOf('vendedor') >= 0 || n.indexOf('atencion') >= 0;
}

function CFX_wantsPdf(text) {
  var n = CFX_norm(text);
  return n.indexOf('pdf') >= 0 || n.indexOf('cotizacion') >= 0 || n.indexOf('cotizar') >= 0 || n.indexOf('proforma') >= 0;
}

function CFX_asksPayment(text) {
  var n = CFX_norm(text);
  return n.indexOf('pago') >= 0 || n.indexOf('pagar') >= 0 || n.indexOf('cuenta') >= 0 || n.indexOf('transferencia') >= 0 || n.indexOf('deposito') >= 0 || n.indexOf('depósito') >= 0;
}

function CFX_asksLocation(text) {
  var n = CFX_norm(text);
  return n.indexOf('ubicacion') >= 0 || n.indexOf('ubicación') >= 0 || n.indexOf('direccion') >= 0 || n.indexOf('dirección') >= 0 || n.indexOf('donde estan') >= 0;
}

function CFX_asksHours(text) {
  var n = CFX_norm(text);
  return n.indexOf('horario') >= 0 || n.indexOf('atienden') >= 0 || n.indexOf('abren') >= 0 || n.indexOf('cierran') >= 0;
}

function CFX_detectHeat(message) {
  var n = CFX_norm(message);
  var score = 0;
  var reasons = [];
  function hit(words, points, label) {
    for (var i = 0; i < words.length; i++) {
      if (n.indexOf(CFX_norm(words[i])) >= 0) {
        score += points;
        reasons.push(label);
        return;
      }
    }
  }
  hit(['precio','cuanto','cuánto','vale','costo','valor','sale'], 2, 'precio');
  hit(['tiene','tienen','hay','stock','disponible'], 2, 'stock');
  hit(['necesito','quiero','deme','dame','comprar','separar'], 3, 'compra');
  hit(['hoy','urgente','ahora','ya','inmediato'], 2, 'urgencia');
  hit(['delivery','entrega','envio','envío','domicilio'], 1, 'entrega');
  if (/\b\d+\b/.test(n)) { score += 1; reasons.push('cantidad'); }
  return {
    score: score,
    calor: score >= 8 ? 'CALIENTE' : (score >= 4 ? 'TIBIO' : 'FRIO'),
    reasons: CFX_unique(reasons)
  };
}

function CFX_safeStack(err) {
  if (!err) return '';
  return CFX_truncate(err.stack || err.message || String(err), 2500);
}
