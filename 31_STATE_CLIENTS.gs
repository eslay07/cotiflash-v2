/***************************************************************
 * Archivo: 31_STATE_CLIENTS.gs
 ***************************************************************/

function CFX_getState(waId) {
  var row = CFX_findRowByValue(CFX_SHEETS.STATE, 1, waId);
  if (!row) return { waId: waId, estadoActual: CFX_STATE.NUEVO, cart: [] };
  var r = CFX_sheet(CFX_SHEETS.STATE).getRange(row, 1, 1, CFX_HEADERS[CFX_SHEETS.STATE].length).getValues()[0];
  return {
    waId: CFX_clean(r[0]),
    nombre: CFX_clean(r[1]),
    estadoActual: CFX_clean(r[2]),
    intencionPrevia: CFX_clean(r[3]),
    cart: CFX_jsonParseSafe(r[4], []),
    ultimaCotizacionId: CFX_clean(r[5]),
    ultimoMensaje: CFX_clean(r[6]),
    ultimaRespuesta: CFX_clean(r[7]),
    expiraEn: CFX_clean(r[8]),
    notas: CFX_clean(r[10])
  };
}

function CFX_setState(waId, name, estadoActual, intent, cart, quoteId, lastMessage, lastResponse, notes) {
  var sh = CFX_sheet(CFX_SHEETS.STATE);
  var row = CFX_findRowByValue(CFX_SHEETS.STATE, 1, waId);
  var values = [
    waId,
    name || '',
    estadoActual || CFX_STATE.NUEVO,
    intent || '',
    JSON.stringify(cart || []),
    quoteId || '',
    lastMessage || '',
    lastResponse || '',
    CFX_datePlusDays(1),
    CFX_now(),
    notes || ''
  ];
  if (row) sh.getRange(row, 1, 1, values.length).setValues([values]);
  else sh.appendRow(values);
}

function CFX_clearState(waId, name, notes) {
  CFX_setState(waId, name || '', CFX_STATE.NUEVO, '', [], '', '', '', notes || 'Estado limpiado');
}

function CFX_upsertClient(waId, name) {
  var sh = CFX_sheet(CFX_SHEETS.CLIENTS);
  var row = CFX_findRowByValue(CFX_SHEETS.CLIENTS, 1, waId);
  if (row) {
    sh.getRange(row, 2).setValue(name || sh.getRange(row, 2).getValue());
    sh.getRange(row, 10).setValue(CFX_now());
  } else {
    sh.appendRow([waId, name || '', waId, '', '', '', 'WHATSAPP', 'ACTIVO', CFX_now(), CFX_now(), '']);
  }
}

function CFX_isDuplicateMessage(messageId) {
  if (!messageId) return false;
  return !!CFX_findRowByValue(CFX_SHEETS.CONVERSATIONS, 12, messageId);
}

function CFX_recordConversation(data) {
  var id = CFX_nextId(CFX_SHEETS.CONVERSATIONS, 1, 'CONV');
  CFX_append(CFX_SHEETS.CONVERSATIONS, [
    id,
    CFX_now(),
    data.waId || '',
    data.name || '',
    data.phone || data.waId || '',
    data.inbound || '',
    data.outbound || '',
    data.intent || '',
    data.heat || '',
    data.score || 0,
    data.productsText || '',
    data.messageId || '',
    data.engine || '',
    data.status || '',
    data.error || ''
  ]);
  return id;
}
