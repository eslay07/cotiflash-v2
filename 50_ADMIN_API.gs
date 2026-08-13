/***************************************************************
 * Archivo: 50_ADMIN_API.gs
 ***************************************************************/

function CFX_API_bootstrap() {
  CFX_setupSheets();
  return {
    config: CFX_getPublicConfig(),
    stats: CFX_getStats(),
    catalog: CFX_getProductsRaw(true).slice(0, 100),
    conversations: CFX_getLastRows(CFX_SHEETS.CONVERSATIONS, 15)
  };
}

function CFX_API_saveConfig(obj) {
  CFX_setupSheets();
  obj = obj || {};
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].indexOf('SECRET_') === 0) continue;
    CFX_setConfig(keys[i], obj[keys[i]]);
  }
  CFX_log('CONFIG_SAVE', 'Configuración guardada desde panel', { keys: keys });
  return { ok: true };
}

function CFX_API_saveSecrets(obj) {
  CFX_setupSheets();
  obj = obj || {};
  if (obj.GROQ_API_KEY) CFX_setSecret(CFX_SECRET_KEYS.GROQ_API_KEY, obj.GROQ_API_KEY);
  if (obj.WA_ACCESS_TOKEN) CFX_setSecret(CFX_SECRET_KEYS.WA_ACCESS_TOKEN, obj.WA_ACCESS_TOKEN);
  if (obj.WA_PHONE_NUMBER_ID) CFX_setSecret(CFX_SECRET_KEYS.WA_PHONE_NUMBER_ID, obj.WA_PHONE_NUMBER_ID);
  if (obj.WA_VERIFY_TOKEN) CFX_setSecret(CFX_SECRET_KEYS.WA_VERIFY_TOKEN, obj.WA_VERIFY_TOKEN);
  CFX_log('SECRETS_SAVE', 'Secretos actualizados desde panel', {
    groq: !!obj.GROQ_API_KEY,
    waToken: !!obj.WA_ACCESS_TOKEN,
    phoneId: !!obj.WA_PHONE_NUMBER_ID,
    verify: !!obj.WA_VERIFY_TOKEN
  });
  return { ok: true, secrets: CFX_getPublicConfig().SECRETS };
}

function CFX_API_toggle(key) {
  var current = CFX_getConfig(key, 'NO');
  CFX_setConfig(key, CFX_bool(current) ? 'NO' : 'SI');
  return { ok: true, key: key, value: CFX_getConfig(key, '') };
}

function CFX_API_importCatalog(text) {
  return CFX_importCatalogText(text);
}

function CFX_API_simulate(text) {
  CFX_setupSheets();
  var result = CFX_handleIncomingMessage('+593 00 000 0000', 'Cliente Demo', text || 'Tienen cable HDMI?', 'SIM-' + new Date().getTime());
  return result;
}

function CFX_API_testGroq(text) {
  CFX_setupSheets();
  var state = { estadoActual: CFX_STATE.NUEVO, cart: [] };
  var candidates = CFX_searchProductCandidates(text || 'Tienen cable HDMI?', CFX_num(CFX_getConfig('IA_MAX_CANDIDATOS', 8)));
  return CFX_aiClassifyMessage(text || 'Tienen cable HDMI?', state, candidates);
}

function CFX_API_getCatalog() {
  return CFX_getProductsRaw(true).slice(0, 300);
}

function CFX_API_getConversations(limit) {
  return CFX_getLastRows(CFX_SHEETS.CONVERSATIONS, limit || 30);
}

function CFX_API_diagnostic() {
  return CFX_diagnostic();
}
