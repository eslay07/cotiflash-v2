/***************************************************************
 * Archivo: 90_TESTS.gs
 ***************************************************************/

function TEST_CFX_FLOW_LOCAL() {
  CFX_setupSheets();
  var tests = [
    'Hola',
    'Tienen cable HDMI?',
    'Tienes leche?',
    'Tiene comida de perro?',
    'Necesito 2 cables HDMI y 1 mouse inalámbrico, cotización PDF por favor',
    'Pago'
  ];
  var out = [];
  for (var i = 0; i < tests.length; i++) {
    out.push(CFX_handleIncomingMessage('+593 00 000 0000', 'Cliente Demo', tests[i], 'TEST-' + new Date().getTime() + '-' + i));
  }
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

function TEST_CFX_GROQ() {
  CFX_setupSheets();
  var text = 'Tienen cable HDMI?';
  var candidates = CFX_searchProductCandidates(text, 8);
  var result = CFX_aiClassifyMessage(text, { estadoActual: CFX_STATE.NUEVO, cart: [] }, candidates);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function TEST_CFX_PDF() {
  CFX_setupSheets();
  var products = CFX_searchProductCandidates('cable HDMI', 3);
  var q = CFX_createQuote('+593 00 000 0000', 'Cliente Demo', 'cable HDMI', products, { calor: 'FRIO', score: 0 }, 'Prueba PDF');
  Logger.log(JSON.stringify(q, null, 2));
  return q;
}
