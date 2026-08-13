/***************************************************************
 * Archivo: 04_SHEETS_LOGS.gs
 ***************************************************************/

function CFX_ss() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function CFX_sheet(name) {
  var ss = CFX_ss();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function CFX_setupSheets() {
  var names = Object.keys(CFX_HEADERS);
  for (var i = 0; i < names.length; i++) {
    CFX_prepareSheet(names[i], CFX_HEADERS[names[i]]);
  }
  CFX_seedDefaults();
  CFX_seedHelp();
  CFX_seedCatalogIfEmpty();
  CFX_migrateVisibleSecretsToProperties();
  CFX_setConfig('VERSION', CFX.VERSION);
  if (!CFX_getConfig('INSTALLED_AT', '')) CFX_setConfig('INSTALLED_AT', CFX_now());
  CFX_log('INSTALL', 'Sistema instalado/reparado', { version: CFX.VERSION });
  return true;
}

function CFX_prepareSheet(name, headers) {
  var sh = CFX_sheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  var current = sh.getRange(1, 1, 1, Math.max(headers.length, sh.getLastColumn() || 1)).getValues()[0];
  var shouldSet = false;
  for (var i = 0; i < headers.length; i++) {
    if (CFX_clean(current[i]) !== headers[i]) {
      shouldSet = true;
      break;
    }
  }
  if (shouldSet) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1c232');
  try { sh.autoResizeColumns(1, headers.length); } catch (err) {}
}

function CFX_seedDefaults() {
  var sh = CFX_sheet(CFX_SHEETS.CONFIG);
  for (var i = 0; i < CFX_CONFIG_DEFAULTS.length; i++) {
    var d = CFX_CONFIG_DEFAULTS[i];
    if (!CFX_findConfigRow(d[1])) {
      sh.appendRow([d[0], d[1], d[2], d[3], d[4], d[5], d[6], CFX_now()]);
    }
  }
}

function CFX_seedHelp() {
  var sh = CFX_sheet(CFX_SHEETS.HELP);
  if (sh.getLastRow() > 1) return;
  var rows = [
    ['Flujo', 'WhatsApp entra por doPost, se valida duplicado, se buscan productos locales, Groq clasifica candidatos, el router decide respuesta.'],
    ['Seguridad', 'Tokens de Groq y WhatsApp se guardan en PropertiesService, no en hojas ni en GitHub.'],
    ['IA', 'Groq solo clasifica intención/productos. Precios, stock y PDF salen del catálogo y del sistema.'],
    ['Producto vendible', 'Copia este Spreadsheet por cliente. Cada cliente queda aislado con su propia configuración.']
  ];
  sh.getRange(2, 1, rows.length, 2).setValues(rows);
}

function CFX_seedCatalogIfEmpty() {
  var sh = CFX_sheet(CFX_SHEETS.PRODUCTS);
  if (sh.getLastRow() > 1) return;
  var rows = [
    ['SKU-0001','Cable HDMI 2m','CABLES','PRODUCTO','hdmi,cable hdmi,tv,monitor,proyector','cable para tv','SKU-0003',3.50,7.00,25,5,'ACTIVO','Ideal para conectar TV, monitor o proyector.','NO','Producto sin stock por confirmar.',CFX_now()],
    ['SKU-0002','Mouse inalámbrico','ACCESORIOS','PRODUCTO','mouse,raton,inalambrico,mouse inalambrico,computadora,laptop','ratón inalámbrico','SKU-0004',6.00,12.00,12,3,'ACTIVO','Mouse inalámbrico cómodo para laptop o PC.','NO','Producto sin stock por confirmar.',CFX_now()],
    ['SKU-0003','Adaptador HDMI a VGA','ADAPTADORES','PRODUCTO','adaptador hdmi,hdmi vga,vga,monitor antiguo,proyector','convertidor hdmi vga','SKU-0001',4.00,8.00,10,2,'ACTIVO','Útil para conectar equipos HDMI a monitores VGA.','NO','Producto sin stock por confirmar.',CFX_now()],
    ['SKU-0004','Pad mouse básico','ACCESORIOS','PRODUCTO','pad mouse,alfombrilla,mousepad,base mouse','mouse pad','SKU-0002',1.20,3.50,30,5,'ACTIVO','Mejora el uso y precisión del mouse.','NO','Producto sin stock por confirmar.',CFX_now()],
    ['SER-0001','Instalación técnica básica','SERVICIOS','SERVICIO','instalacion,instalar,servicio tecnico,visita tecnica,soporte','soporte técnico','',0,25.00,999,0,'ACTIVO','Servicio técnico básico sujeto a revisión.','SI','Servicio sujeto a agenda.',CFX_now()]
  ];
  sh.getRange(2, 1, rows.length, CFX_HEADERS[CFX_SHEETS.PRODUCTS].length).setValues(rows);
}

function CFX_append(sheetName, row) {
  CFX_sheet(sheetName).appendRow(row);
}

function CFX_findRowByValue(sheetName, colIndex, value) {
  var sh = CFX_sheet(sheetName);
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var vals = sh.getRange(2, colIndex, last - 1, 1).getValues();
  var needle = CFX_clean(value);
  for (var i = 0; i < vals.length; i++) {
    if (CFX_clean(vals[i][0]) === needle) return i + 2;
  }
  return 0;
}

function CFX_log(action, detail, data) {
  try {
    var id = CFX_nextId(CFX_SHEETS.LOG, 1, 'LOG');
    CFX_append(CFX_SHEETS.LOG, [id, CFX_now(), action, CFX_truncate(detail), CFX_truncate(CFX_jsonStringify(data || {}))]);
  } catch (err) {}
}

function CFX_error(context, err, data) {
  try {
    var id = CFX_nextId(CFX_SHEETS.ERRORS, 1, 'ERR');
    CFX_append(CFX_SHEETS.ERRORS, [id, CFX_now(), context, CFX_truncate(err && err.message ? err.message : err), CFX_safeStack(err), CFX_truncate(CFX_jsonStringify(data || {}))]);
  } catch (e) {}
}

function CFX_countRows(sheetName) {
  return Math.max(0, CFX_sheet(sheetName).getLastRow() - 1);
}

function CFX_getStats() {
  return {
    version: CFX.VERSION,
    productos: CFX_countRows(CFX_SHEETS.PRODUCTS),
    conversaciones: CFX_countRows(CFX_SHEETS.CONVERSATIONS),
    cotizaciones: CFX_countRows(CFX_SHEETS.QUOTES),
    errores: CFX_countRows(CFX_SHEETS.ERRORS),
    secretos: CFX_getPublicConfig().SECRETS
  };
}

function CFX_getLastRows(sheetName, limit) {
  var sh = CFX_sheet(sheetName);
  var last = sh.getLastRow();
  if (last < 2) return [];
  limit = limit || 20;
  var start = Math.max(2, last - limit + 1);
  var values = sh.getRange(start, 1, last - start + 1, sh.getLastColumn()).getDisplayValues();
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  var out = [];
  for (var i = values.length - 1; i >= 0; i--) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = values[i][j];
    out.push(obj);
  }
  return out;
}
