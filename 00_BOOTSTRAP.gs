/***************************************************************
 * Archivo: 00_BOOTSTRAP.gs
 * Punto de entrada de menú y funciones principales visibles.
 ***************************************************************/

function onOpen() {
  CFX_onOpen();
}

function CFX_onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(CFX.MENU)
    .addItem('Abrir panel administrativo', 'CFX_openAdminPanel')
    .addItem('Instalar / reparar sistema', 'CFX_install')
    .addSeparator()
    .addItem('Probar flujo local', 'TEST_CFX_FLOW_LOCAL')
    .addItem('Probar Groq', 'TEST_CFX_GROQ')
    .addItem('Probar PDF', 'TEST_CFX_PDF')
    .addSeparator()
    .addItem('Diagnóstico técnico', 'CFX_showDiagnostic')
    .addToUi();
}

function CFX_install() {
  CFX_setupSheets();
  SpreadsheetApp.getUi().alert('CotiFlash v2 instalado/reparado correctamente.');
}

function CFX_openAdminPanel() {
  CFX_setupSheets();
  var html = HtmlService.createHtmlOutputFromFile('AdminPanel')
    .setTitle('CotiFlash v2 PRO GROQ')
    .setWidth(560);
  SpreadsheetApp.getUi().showSidebar(html);
}

function CFX_showDiagnostic() {
  CFX_setupSheets();
  SpreadsheetApp.getUi().alert(JSON.stringify(CFX_diagnostic(), null, 2));
}

function CFX_diagnostic() {
  return {
    ok: true,
    version: CFX.VERSION,
    spreadsheet: CFX_ss().getName(),
    stats: CFX_getStats(),
    config: {
      IA_ENABLED: CFX_getConfig('IA_ENABLED',''),
      GROQ_MODEL: CFX_getConfig('GROQ_MODEL',''),
      MODO_WHATSAPP: CFX_getConfig('MODO_WHATSAPP',''),
      RESPUESTA_AUTO: CFX_getConfig('RESPUESTA_AUTO','')
    }
  };
}
