/***************************************************************
 * Archivo: 33_QUOTES_PDF.gs
 ***************************************************************/

function CFX_createQuote(waId, name, originalText, products, heat, notes) {
  var c = CFX_getConfigMap();
  var id = CFX_nextId(CFX_SHEETS.QUOTES, 1, 'COT');
  var ivaPct = CFX_num(c.IVA_PORCENTAJE_DEFECTO || 0);
  var descuento = CFX_num(c.DESCUENTO_DEFECTO || 0);
  var subtotal = 0;

  var itemRows = [];
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var qty = Math.max(1, CFX_num(p.cantidad || 1));
    var line = qty * CFX_num(p.precio);
    subtotal += line;
    itemRows.push([
      id + '-IT' + Utilities.formatString('%03d', i + 1),
      id,
      p.sku,
      p.nombre,
      qty,
      CFX_num(p.precio),
      0,
      line,
      'PRINCIPAL',
      p.matchType || ''
    ]);
  }

  var subtotalDesc = Math.max(0, subtotal - descuento);
  var ivaVal = subtotalDesc * ivaPct / 100;
  var total = subtotalDesc + ivaVal;
  var validUntil = CFX_datePlusDays(CFX_num(c.VALIDEZ_COTIZACION_DIAS || 2));

  CFX_append(CFX_SHEETS.QUOTES, [
    id, CFX_now(), waId, name, waId, originalText, 'GENERADA',
    subtotal, descuento, ivaPct, ivaVal, total, '', '', '', heat.calor || '', heat.score || 0,
    validUntil, notes || ''
  ]);

  if (itemRows.length) {
    CFX_sheet(CFX_SHEETS.QUOTE_ITEMS).getRange(CFX_sheet(CFX_SHEETS.QUOTE_ITEMS).getLastRow() + 1, 1, itemRows.length, CFX_HEADERS[CFX_SHEETS.QUOTE_ITEMS].length).setValues(itemRows);
  }

  var pdfUrl = CFX_createPdfForQuote(id);
  var msg = CFX_buildProductSummary(name, products, pdfUrl, true) + '\n\n' + (c.FIRMA_MENSAJES || '');
  var link = CFX_waLink(waId, msg);
  CFX_updateQuoteOutput(id, pdfUrl, msg, link);
  CFX_createFollowUp(id, name, waId, msg);

  return { id: id, pdfUrl: pdfUrl, total: total };
}

function CFX_getQuote(id) {
  var row = CFX_findRowByValue(CFX_SHEETS.QUOTES, 1, id);
  if (!row) throw new Error('Cotización no encontrada: ' + id);
  var qVals = CFX_sheet(CFX_SHEETS.QUOTES).getRange(row, 1, 1, CFX_HEADERS[CFX_SHEETS.QUOTES].length).getValues()[0];
  var q = {
    id: qVals[0], fecha: qVals[1], waId: qVals[2], cliente: qVals[3], telefono: qVals[4],
    original: qVals[5], estado: qVals[6], subtotal: CFX_num(qVals[7]), descuento: CFX_num(qVals[8]),
    ivaPct: CFX_num(qVals[9]), ivaVal: CFX_num(qVals[10]), total: CFX_num(qVals[11]),
    pdfUrl: qVals[12], validaHasta: qVals[17], notas: qVals[18], items: []
  };

  var sh = CFX_sheet(CFX_SHEETS.QUOTE_ITEMS);
  var last = sh.getLastRow();
  if (last >= 2) {
    var vals = sh.getRange(2, 1, last - 1, CFX_HEADERS[CFX_SHEETS.QUOTE_ITEMS].length).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (CFX_clean(vals[i][1]) === CFX_clean(id)) {
        q.items.push({
          sku: vals[i][2],
          producto: vals[i][3],
          cantidad: CFX_num(vals[i][4]),
          precioUnit: CFX_num(vals[i][5]),
          descuento: CFX_num(vals[i][6]),
          total: CFX_num(vals[i][7])
        });
      }
    }
  }
  return q;
}

function CFX_createPdfForQuote(id) {
  var c = CFX_getConfigMap();
  var q = CFX_getQuote(id);
  var folder = CFX_getPdfFolder();
  var docName = 'Cotizacion_' + id + '_' + CFX_clean(q.cliente).replace(/[^\w\-]+/g, '_');
  var doc = DocumentApp.create(docName);
  var body = doc.getBody();

  body.appendParagraph(c.NOMBRE_NEGOCIO || 'Mi Negocio').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Cotización: ' + q.id).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Fecha: ' + CFX_now());
  body.appendParagraph('Cliente: ' + q.cliente);
  body.appendParagraph('Teléfono: ' + q.telefono);
  if (c.RUC_NEGOCIO) body.appendParagraph('RUC: ' + c.RUC_NEGOCIO);
  if (c.DIRECCION_NEGOCIO) body.appendParagraph('Dirección: ' + c.DIRECCION_NEGOCIO);
  body.appendParagraph('Validez: ' + q.validaHasta);
  body.appendParagraph('');

  var tableData = [['SKU','Producto','Cant.','P. Unit','Total']];
  for (var i = 0; i < q.items.length; i++) {
    tableData.push([
      q.items[i].sku,
      q.items[i].producto,
      String(q.items[i].cantidad),
      '$' + CFX_money(q.items[i].precioUnit),
      '$' + CFX_money(q.items[i].total)
    ]);
  }
  body.appendTable(tableData);

  body.appendParagraph('');
  body.appendParagraph('Subtotal: $' + CFX_money(q.subtotal));
  body.appendParagraph('Descuento: $' + CFX_money(q.descuento));
  body.appendParagraph('IVA ' + CFX_money(q.ivaPct) + '%: $' + CFX_money(q.ivaVal));
  body.appendParagraph('TOTAL: $' + CFX_money(q.total)).setHeading(DocumentApp.ParagraphHeading.HEADING2);

  if (c.PDF_TERMINOS) {
    body.appendParagraph('');
    body.appendParagraph('Términos: ' + c.PDF_TERMINOS);
  }
  if (c.FIRMA_MENSAJES) body.appendParagraph(c.FIRMA_MENSAJES);
  doc.saveAndClose();

  var docFile = DriveApp.getFileById(doc.getId());
  var pdfBlob = docFile.getAs(MimeType.PDF).setName(docName + '.pdf');
  var pdfFile = folder.createFile(pdfBlob);

  if (CFX_bool(c.PDF_PUBLICO || 'SI')) {
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  if (CFX_bool(c.BORRAR_DOC_TEMPORAL || 'SI')) {
    try { docFile.setTrashed(true); } catch (err) {}
  } else {
    try { folder.addFile(docFile); DriveApp.getRootFolder().removeFile(docFile); } catch (err2) {}
  }

  CFX_log('PDF_OK', 'PDF generado ' + id, { fileId: pdfFile.getId() });
  return pdfFile.getUrl();
}

function CFX_getPdfFolder() {
  var folderId = CFX_clean(CFX_getConfig('PDF_FOLDER_ID', ''));
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch (err) {}
  }
  var folder = DriveApp.createFolder('CotiFlash PDFs - ' + CFX_ss().getName());
  CFX_setConfig('PDF_FOLDER_ID', folder.getId());
  return folder;
}

function CFX_updateQuoteOutput(id, pdfUrl, msg, link) {
  var row = CFX_findRowByValue(CFX_SHEETS.QUOTES, 1, id);
  if (!row) return;
  var sh = CFX_sheet(CFX_SHEETS.QUOTES);
  sh.getRange(row, 13).setValue(pdfUrl);
  sh.getRange(row, 14).setValue(msg);
  sh.getRange(row, 15).setValue(link);
  sh.getRange(row, 7).setValue('ENVIADA');
}

function CFX_createFollowUp(id, name, phone, msg) {
  var days = CFX_num(CFX_getConfig('DIAS_SEGUIMIENTO', 1));
  var followDate = CFX_datePlusDays(days);
  CFX_append(CFX_SHEETS.FOLLOWUPS, [
    CFX_nextId(CFX_SHEETS.FOLLOWUPS, 1, 'SEG'),
    CFX_now(),
    id,
    name,
    phone,
    'COTIZACION',
    followDate,
    'Seguimiento de cotización ' + id,
    CFX_waLink(phone, 'Hola, le escribimos para saber si desea continuar con la cotización ' + id + '.'),
    'PENDIENTE',
    ''
  ]);
}
