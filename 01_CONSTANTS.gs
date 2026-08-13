/***************************************************************
 * CotiFlash v2 PRO GROQ
 * Archivo: 01_CONSTANTS.gs
 * Objetivo: constantes, nombres de hojas, headers y defaults.
 ***************************************************************/

var CFX = {
  VERSION: '2.0.0-PRO-GROQ-STRICT',
  TZ: 'America/Guayaquil',
  MENU: '⚡ CotiFlash v2',
  MAX_LOG_CHARS: 1800,
  DEFAULT_ROWS: 1000,
  DEFAULT_GROQ_MODEL: 'llama-3.3-70b-versatile',
  GROQ_URL: 'https://api.groq.com/openai/v1/chat/completions'
};

var CFX_SHEETS = {
  CONFIG: 'CFG_PARAMETROS',
  PRODUCTS: 'CAT_PRODUCTOS',
  CLIENTS: 'CRM_CLIENTES',
  STATE: 'CRM_ESTADO_CLIENTE',
  CONVERSATIONS: 'CRM_CONVERSACIONES',
  QUOTES: 'VENT_COTIZACIONES',
  QUOTE_ITEMS: 'VENT_ITEMS_COTIZACION',
  PAYMENTS: 'VENT_PAGOS',
  FOLLOWUPS: 'AUTO_SEGUIMIENTOS',
  QUEUE: 'AUTO_COLA_MENSAJES',
  IA_LOG: 'SYS_IA_LOG',
  LOG: 'SYS_LOG',
  ERRORS: 'SYS_ERRORES',
  DASHBOARD: 'SYS_DASHBOARD',
  HELP: 'SYS_AYUDA'
};

var CFX_SECRET_KEYS = {
  GROQ_API_KEY: 'CFX_GROQ_API_KEY',
  WA_ACCESS_TOKEN: 'CFX_WA_ACCESS_TOKEN',
  WA_PHONE_NUMBER_ID: 'CFX_WA_PHONE_NUMBER_ID',
  WA_VERIFY_TOKEN: 'CFX_WA_VERIFY_TOKEN'
};

var CFX_HEADERS = {};
CFX_HEADERS[CFX_SHEETS.CONFIG] = ['MODULO','CLAVE','VALOR','TIPO','OPCIONES','VISIBLE_PANEL','DESCRIPCION','UPDATED_AT'];
CFX_HEADERS[CFX_SHEETS.PRODUCTS] = ['SKU','NOMBRE','CATEGORIA','TIPO','KEYWORDS','ALIAS','RELACIONADOS_SKU','COSTO','PRECIO','STOCK','STOCK_MIN','ESTADO','RESPUESTA_BASE','REQUIERE_CONFIRMAR_STOCK','MENSAJE_SIN_STOCK','UPDATED_AT'];
CFX_HEADERS[CFX_SHEETS.CLIENTS] = ['WA_ID','NOMBRE','TELEFONO','EMAIL','CIUDAD','DIRECCION','TIPO_CLIENTE','ESTADO','PRIMER_CONTACTO','ULTIMO_CONTACTO','NOTAS'];
CFX_HEADERS[CFX_SHEETS.STATE] = ['WA_ID','NOMBRE','ESTADO_ACTUAL','INTENCION_PREVIA','CARRITO_JSON','ULTIMA_COTIZACION_ID','ULTIMO_MENSAJE','ULTIMA_RESPUESTA','EXPIRA_EN','UPDATED_AT','NOTAS'];
CFX_HEADERS[CFX_SHEETS.CONVERSATIONS] = ['ID','FECHA','WA_ID','NOMBRE','TELEFONO','MENSAJE_ENTRANTE','RESPUESTA_BOT','INTENCION','CALOR','SCORE','PRODUCTOS_DETECTADOS','MESSAGE_ID','ENGINE','ESTADO','ERROR'];
CFX_HEADERS[CFX_SHEETS.QUOTES] = ['ID_COTIZACION','FECHA','WA_ID','CLIENTE','TELEFONO','MENSAJE_ORIGINAL','ESTADO','SUBTOTAL','DESCUENTO','IVA_PCT','IVA_VAL','TOTAL','PDF_URL','MENSAJE_CLIENTE','LINK_WHATSAPP','CALOR','SCORE','VALIDA_HASTA','NOTAS'];
CFX_HEADERS[CFX_SHEETS.QUOTE_ITEMS] = ['ID_ITEM','ID_COTIZACION','SKU','PRODUCTO','CANTIDAD','PRECIO_UNIT','DESCUENTO','TOTAL','TIPO_ITEM','NOTAS'];
CFX_HEADERS[CFX_SHEETS.PAYMENTS] = ['ID_PAGO','FECHA','ID_COTIZACION','CLIENTE','TELEFONO','MONTO_TOTAL','MONTO_REPORTADO','SALDO','METODO','ESTADO','COMPROBANTE_ID','NOTIFICADO_ENCARGADO','NOTAS'];
CFX_HEADERS[CFX_SHEETS.FOLLOWUPS] = ['ID','FECHA','ID_COTIZACION','CLIENTE','TELEFONO','TIPO','FECHA_ACCION','MENSAJE','LINK_WHATSAPP','ESTADO','NOTAS'];
CFX_HEADERS[CFX_SHEETS.QUEUE] = ['ID','FECHA','TIPO','DESTINO','MENSAJE','REFERENCIA_ID','ESTADO','FECHA_ENVIO','ERROR','NOTAS'];
CFX_HEADERS[CFX_SHEETS.IA_LOG] = ['ID','FECHA','ACCION','MENSAJE','CANDIDATOS','RESPUESTA_JSON','ESTADO','ERROR','TOKENS_IN','TOKENS_OUT'];
CFX_HEADERS[CFX_SHEETS.LOG] = ['ID','FECHA','ACCION','DETALLE','DATA_JSON'];
CFX_HEADERS[CFX_SHEETS.ERRORS] = ['ID','FECHA','CONTEXTO','ERROR','STACK','DATA_JSON'];
CFX_HEADERS[CFX_SHEETS.DASHBOARD] = ['METRICA','VALOR','UPDATED_AT'];
CFX_HEADERS[CFX_SHEETS.HELP] = ['SECCION','DESCRIPCION'];

var CFX_CONFIG_DEFAULTS = [
  ['NEGOCIO','NOMBRE_NEGOCIO','Mi Negocio','TEXT','','SI','Nombre comercial para mensajes y PDF'],
  ['NEGOCIO','RUC_NEGOCIO','','TEXT','','SI','RUC o CI del negocio'],
  ['NEGOCIO','CIUDAD','Quito','TEXT','','SI','Ciudad del negocio'],
  ['NEGOCIO','DIRECCION_NEGOCIO','','TEXT','','SI','Dirección visible'],
  ['NEGOCIO','WHATSAPP_NEGOCIO','','TEXT','','SI','WhatsApp visible del negocio'],
  ['NEGOCIO','EMAIL_NEGOCIO','','TEXT','','SI','Correo visible del negocio'],
  ['NEGOCIO','FIRMA_MENSAJES','Saludos, Mi Negocio','TEXT','','SI','Firma al final de respuestas'],

  ['VENTAS','MONEDA','USD','TEXT','','SI','Moneda'],
  ['VENTAS','IVA_PORCENTAJE_DEFECTO','15','NUMBER','','SI','IVA por defecto'],
  ['VENTAS','VALIDEZ_COTIZACION_DIAS','2','NUMBER','','SI','Días de validez de cotización'],
  ['VENTAS','DIAS_SEGUIMIENTO','1','NUMBER','','SI','Días para seguimiento automático'],
  ['VENTAS','DESCUENTO_DEFECTO','0','NUMBER','','SI','Descuento por defecto'],

  ['PDF','PDF_PUBLICO','SI','BOOLEAN','SI,NO','SI','Compartir PDF con link público'],
  ['PDF','PDF_FOLDER_ID','','TEXT','','NO','ID carpeta de Drive para PDFs'],
  ['PDF','BORRAR_DOC_TEMPORAL','SI','BOOLEAN','SI,NO','SI','Borrar documento temporal luego de crear PDF'],
  ['PDF','PDF_TERMINOS','Precios sujetos a stock y confirmación final.','TEXT','','SI','Términos comerciales'],

  ['WHATSAPP','MODO_WHATSAPP','API','SELECT','API,LINKS,SOLO_REGISTRO','SI','API responde automático; LINKS genera wa.me; SOLO_REGISTRO no envía'],
  ['WHATSAPP','GRAPH_API_VERSION','v20.0','TEXT','','SI','Versión Graph API de Meta'],
  ['WHATSAPP','RESPUESTA_AUTO','SI','BOOLEAN','SI,NO','SI','Activa/desactiva respuesta automática'],
  ['WHATSAPP','MAX_RESPUESTAS_DIA','300','NUMBER','','SI','Límite simple de respuestas por día'],
  ['WHATSAPP','MODO_DEBUG','NO','BOOLEAN','SI,NO','SI','Guardar payloads largos solo en pruebas'],
  ['WHATSAPP','MENSAJE_SIN_PRODUCTO','Por ahora no tengo ese producto registrado con claridad. ¿Me indica el nombre exacto, marca/modelo o desea que lo revise un asesor?','TEXT','','SI','Respuesta cuando no encuentra producto'],
  ['WHATSAPP','MENSAJE_ERROR','Gracias por escribirnos. En este momento estamos revisando su consulta y le responderemos en breve.','TEXT','','SI','Respuesta ante error interno'],
  ['WHATSAPP','MENSAJE_NO_TEXTO','Gracias por escribirnos. Recibimos su archivo o imagen; un asesor lo revisará.','TEXT','','SI','Respuesta para imagen/audio/documento'],

  ['IA','IA_ENABLED','SI','BOOLEAN','SI,NO','SI','Activa Groq'],
  ['IA','IA_PROVIDER','GROQ','TEXT','','NO','Proveedor IA'],
  ['IA','GROQ_MODEL','llama-3.3-70b-versatile','TEXT','','SI','Modelo de Groq'],
  ['IA','IA_MODE','CLASIFICADOR','SELECT','CLASIFICADOR,REDACTOR,OFF','SI','CLASIFICADOR recomendado'],
  ['IA','IA_MAX_CANDIDATOS','8','NUMBER','','SI','Máximo productos candidatos enviados a Groq'],
  ['IA','IA_TIMEOUT_MS','12000','NUMBER','','SI','Timeout llamada Groq'],
  ['IA','IA_MAX_OUTPUT_TOKENS','350','NUMBER','','SI','Máximo tokens de salida'],
  ['IA','IA_TEMPERATURE','0.05','NUMBER','','SI','Baja temperatura para precisión'],
  ['IA','IA_FALLBACK_REGLAS','SI','BOOLEAN','SI,NO','SI','Si Groq falla, usa reglas locales'],
  ['IA','IA_LOG_PROMPTS','NO','BOOLEAN','SI,NO','SI','No activar en producción'],

  ['PAGOS','PAGO_MODO','TRANSFERENCIA','SELECT','TRANSFERENCIA,LINK,MIXTO,NO_CONFIGURADO','SI','Modo de pago'],
  ['PAGOS','PAGO_BANCO','','TEXT','','SI','Banco'],
  ['PAGOS','PAGO_TIPO_CUENTA','','TEXT','','SI','Ahorros/Corriente'],
  ['PAGOS','PAGO_NUMERO_CUENTA','','TEXT','','SI','Número de cuenta'],
  ['PAGOS','PAGO_TITULAR','','TEXT','','SI','Titular'],
  ['PAGOS','PAGO_RUC_CI','','TEXT','','SI','RUC/CI titular'],
  ['PAGOS','PAGO_LINK_GENERAL','','TEXT','','SI','Link de pago'],
  ['PAGOS','PAGO_INSTRUCCIONES_EXTRA','Envíenos el comprobante por este medio para validar su pedido.','TEXT','','SI','Texto adicional de pago'],

  ['SISTEMA','VERSION','2.0.0-PRO-GROQ-STRICT','TEXT','','NO','Versión instalada'],
  ['SISTEMA','CLIENT_ID','','TEXT','','NO','Identificador del cliente'],
  ['SISTEMA','INSTALLED_AT','','TEXT','','NO','Fecha de instalación']
];

var CFX_INTENTS = {
  SALUDO: 'SALUDO',
  CONSULTA_PRODUCTO: 'CONSULTA_PRODUCTO',
  COTIZACION_PROBABLE: 'COTIZACION_PROBABLE',
  COTIZACION_PDF: 'COTIZACION_PDF',
  CONFIRMACION: 'CONFIRMACION',
  PAGO: 'PAGO',
  UBICACION: 'UBICACION',
  HORARIO: 'HORARIO',
  PREGUNTA_BOT: 'PREGUNTA_BOT',
  DERIVAR_ASESOR: 'DERIVAR_ASESOR',
  SIN_PRODUCTO: 'SIN_PRODUCTO',
  NO_TEXTO: 'NO_TEXTO',
  ERROR: 'ERROR'
};

var CFX_STATE = {
  NUEVO: 'NUEVO',
  ESPERANDO_PRODUCTO: 'ESPERANDO_PRODUCTO',
  ESPERANDO_CONFIRMACION_PDF: 'ESPERANDO_CONFIRMACION_PDF',
  ESPERANDO_PAGO: 'ESPERANDO_PAGO',
  DERIVADO_ASESOR: 'DERIVADO_ASESOR',
  CERRADO: 'CERRADO'
};
