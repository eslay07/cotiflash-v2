/***************************************************************
 * Archivo: 03_CONFIG_SECURITY.gs
 * Configuración en hoja. Secretos en PropertiesService.
 ***************************************************************/

function CFX_props() {
  return PropertiesService.getScriptProperties();
}

function CFX_getSecret(key) {
  return CFX_props().getProperty(key) || '';
}

function CFX_setSecret(key, value) {
  if (value === null || value === undefined) return;
  value = CFX_clean(value);
  if (value) CFX_props().setProperty(key, value);
}

function CFX_deleteSecret(key) {
  CFX_props().deleteProperty(key);
}

function CFX_secretStatus(key) {
  var v = CFX_getSecret(key);
  if (!v) return { configured: false, masked: '' };
  return { configured: true, masked: v.substring(0, 4) + '...' + v.substring(Math.max(4, v.length - 4)) };
}

function CFX_getConfigMap() {
  var sh = CFX_sheet(CFX_SHEETS.CONFIG);
  var last = sh.getLastRow();
  var out = {};
  if (last < 2) return out;
  var vals = sh.getRange(2, 1, last - 1, CFX_HEADERS[CFX_SHEETS.CONFIG].length).getValues();
  for (var i = 0; i < vals.length; i++) {
    var key = CFX_clean(vals[i][1]);
    if (!key) continue;
    out[key] = vals[i][2];
  }
  return out;
}

function CFX_getConfig(key, fallback) {
  var row = CFX_findConfigRow(key);
  if (!row) return fallback;
  var v = CFX_sheet(CFX_SHEETS.CONFIG).getRange(row, 3).getValue();
  return v === '' || v === null || v === undefined ? fallback : v;
}

function CFX_setConfig(key, value) {
  var sh = CFX_sheet(CFX_SHEETS.CONFIG);
  var row = CFX_findConfigRow(key);
  if (!row) {
    sh.appendRow(['CUSTOM', key, value, 'TEXT', '', 'SI', 'Agregado manualmente', CFX_now()]);
  } else {
    sh.getRange(row, 3).setValue(value);
    sh.getRange(row, 8).setValue(CFX_now());
  }
}

function CFX_findConfigRow(key) {
  var sh = CFX_sheet(CFX_SHEETS.CONFIG);
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var vals = sh.getRange(2, 2, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (CFX_clean(vals[i][0]) === CFX_clean(key)) return i + 2;
  }
  return 0;
}

function CFX_getPublicConfig() {
  var map = CFX_getConfigMap();
  var keys = Object.keys(map);
  var out = {};
  for (var i = 0; i < keys.length; i++) out[keys[i]] = map[keys[i]];
  out.SECRETS = {
    GROQ_API_KEY: CFX_secretStatus(CFX_SECRET_KEYS.GROQ_API_KEY),
    WA_ACCESS_TOKEN: CFX_secretStatus(CFX_SECRET_KEYS.WA_ACCESS_TOKEN),
    WA_PHONE_NUMBER_ID: CFX_secretStatus(CFX_SECRET_KEYS.WA_PHONE_NUMBER_ID),
    WA_VERIFY_TOKEN: CFX_secretStatus(CFX_SECRET_KEYS.WA_VERIFY_TOKEN)
  };
  return out;
}

function CFX_getIaConfig() {
  var c = CFX_getConfigMap();
  return {
    enabled: CFX_bool(c.IA_ENABLED),
    provider: CFX_clean(c.IA_PROVIDER || 'GROQ'),
    model: CFX_clean(c.GROQ_MODEL || CFX.DEFAULT_GROQ_MODEL),
    mode: CFX_clean(c.IA_MODE || 'CLASIFICADOR'),
    maxCandidates: Math.max(1, CFX_num(c.IA_MAX_CANDIDATOS || 8)),
    timeoutMs: Math.max(3000, CFX_num(c.IA_TIMEOUT_MS || 12000)),
    maxOutputTokens: Math.max(150, CFX_num(c.IA_MAX_OUTPUT_TOKENS || 350)),
    temperature: Math.max(0, CFX_num(c.IA_TEMPERATURE || 0.05)),
    fallbackRules: CFX_bool(c.IA_FALLBACK_REGLAS || 'SI'),
    logPrompts: CFX_bool(c.IA_LOG_PROMPTS || 'NO'),
    apiKey: CFX_getSecret(CFX_SECRET_KEYS.GROQ_API_KEY)
  };
}

function CFX_getWhatsAppConfig() {
  var c = CFX_getConfigMap();
  return {
    mode: CFX_clean(c.MODO_WHATSAPP || 'API').toUpperCase(),
    graphVersion: CFX_clean(c.GRAPH_API_VERSION || 'v20.0'),
    autoReply: CFX_bool(c.RESPUESTA_AUTO || 'SI'),
    maxDaily: Math.max(1, CFX_num(c.MAX_RESPUESTAS_DIA || 300)),
    debug: CFX_bool(c.MODO_DEBUG || 'NO'),
    noTextMessage: CFX_clean(c.MENSAJE_NO_TEXTO || 'Gracias por escribirnos. Un asesor revisará su mensaje.'),
    errorMessage: CFX_clean(c.MENSAJE_ERROR || 'Gracias por escribirnos. Un asesor revisará su consulta.'),
    verifyToken: CFX_getSecret(CFX_SECRET_KEYS.WA_VERIFY_TOKEN),
    accessToken: CFX_getSecret(CFX_SECRET_KEYS.WA_ACCESS_TOKEN),
    phoneNumberId: CFX_getSecret(CFX_SECRET_KEYS.WA_PHONE_NUMBER_ID)
  };
}

function CFX_migrateVisibleSecretsToProperties() {
  var suspiciousKeys = ['GROQ_API_KEY','ACCESS_TOKEN','PHONE_NUMBER_ID','VERIFY_TOKEN'];
  var sh = CFX_sheet(CFX_SHEETS.CONFIG);
  var last = sh.getLastRow();
  if (last < 2) return;
  var vals = sh.getRange(2, 1, last - 1, CFX_HEADERS[CFX_SHEETS.CONFIG].length).getValues();
  for (var i = 0; i < vals.length; i++) {
    var key = CFX_clean(vals[i][1]);
    var val = CFX_clean(vals[i][2]);
    if (!key || !val) continue;
    if (key === 'GROQ_API_KEY') {
      CFX_setSecret(CFX_SECRET_KEYS.GROQ_API_KEY, val);
      sh.getRange(i + 2, 3).setValue('[MOVIDO_A_PROPERTIES]');
    }
    if (key === 'ACCESS_TOKEN') {
      CFX_setSecret(CFX_SECRET_KEYS.WA_ACCESS_TOKEN, val);
      sh.getRange(i + 2, 3).setValue('[MOVIDO_A_PROPERTIES]');
    }
    if (key === 'PHONE_NUMBER_ID') {
      CFX_setSecret(CFX_SECRET_KEYS.WA_PHONE_NUMBER_ID, val);
      sh.getRange(i + 2, 3).setValue('[MOVIDO_A_PROPERTIES]');
    }
    if (key === 'VERIFY_TOKEN') {
      CFX_setSecret(CFX_SECRET_KEYS.WA_VERIFY_TOKEN, val);
      sh.getRange(i + 2, 3).setValue('[MOVIDO_A_PROPERTIES]');
    }
  }
}
