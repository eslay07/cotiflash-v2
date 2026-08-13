/***************************************************************
 * Archivo: 40_WHATSAPP_WEBHOOK.gs
 ***************************************************************/

function doGet(e) {
  try {
    CFX_setupSheets();
    var wa = CFX_getWhatsAppConfig();
    var mode = e && e.parameter ? e.parameter['hub.mode'] : '';
    var token = e && e.parameter ? e.parameter['hub.verify_token'] : '';
    var challenge = e && e.parameter ? e.parameter['hub.challenge'] : '';

    if (mode === 'subscribe' && token === wa.verifyToken) {
      CFX_log('WEBHOOK_VERIFY_OK', 'Webhook verificado', {});
      return CFX_textOut(challenge);
    }
    CFX_log('WEBHOOK_VERIFY_FAIL', 'Verificación fallida', { mode: mode, tokenReceived: !!token });
    return CFX_textOut('Forbidden');
  } catch (err) {
    CFX_error('doGet', err, {});
    return CFX_textOut('Error');
  }
}

function doPost(e) {
  try {
    CFX_setupSheets();
    var raw = e && e.postData ? e.postData.contents : '';
    var waCfg = CFX_getWhatsAppConfig();
    if (waCfg.debug) CFX_log('WEBHOOK_RAW', CFX_truncate(raw, 3000), {});
    if (!raw) return CFX_jsonOut({ ok: true, ignored: 'empty' });

    var body = JSON.parse(raw);
    var events = CFX_parseWhatsAppWebhook(body);
    var processed = 0;

    for (var i = 0; i < events.length; i++) {
      CFX_processWhatsAppEvent(events[i]);
      processed++;
    }

    return CFX_jsonOut({ ok: true, processed: processed });
  } catch (err) {
    CFX_error('doPost', err, { raw: e && e.postData ? CFX_truncate(e.postData.contents, 1000) : '' });
    return CFX_jsonOut({ ok: false, error: err.message });
  }
}

function CFX_parseWhatsAppWebhook(body) {
  var out = [];
  var entries = body.entry || [];
  for (var e = 0; e < entries.length; e++) {
    var changes = entries[e].changes || [];
    for (var c = 0; c < changes.length; c++) {
      var value = changes[c].value || {};
      var contacts = value.contacts || [];
      var contactMap = {};
      for (var k = 0; k < contacts.length; k++) {
        var waid = contacts[k].wa_id || '';
        contactMap[waid] = contacts[k].profile && contacts[k].profile.name ? contacts[k].profile.name : '';
      }

      var messages = value.messages || [];
      for (var m = 0; m < messages.length; m++) {
        var msg = messages[m];
        var from = msg.from || '';
        var type = msg.type || '';
        out.push({
          from: from,
          profileName: contactMap[from] || '',
          type: type,
          text: type === 'text' && msg.text ? msg.text.body : '',
          messageId: msg.id || '',
          timestamp: msg.timestamp || ''
        });
      }

      // statuses no requieren respuesta; se registran solo en debug desde raw.
    }
  }
  return out;
}

function CFX_processWhatsAppEvent(ev) {
  var waCfg = CFX_getWhatsAppConfig();

  if (ev.messageId && CFX_isDuplicateMessage(ev.messageId)) {
    CFX_log('DUPLICATE_MESSAGE', ev.messageId, { from: ev.from });
    return;
  }

  if (ev.type !== 'text') {
    var noText = waCfg.noTextMessage;
    CFX_recordConversation({
      waId: CFX_waNormalize(ev.from),
      name: ev.profileName || '',
      inbound: '[mensaje no textual: ' + ev.type + ']',
      outbound: noText,
      intent: CFX_INTENTS.NO_TEXTO,
      heat: 'FRIO',
      score: 0,
      productsText: '',
      messageId: ev.messageId || '',
      engine: 'REGLAS',
      status: 'NO_TEXTO',
      error: ''
    });
    if (waCfg.autoReply) CFX_sendWhatsAppText(ev.from, noText);
    return;
  }

  var result = CFX_handleIncomingMessage(ev.from, ev.profileName, ev.text, ev.messageId);
  if (result.shouldReply && result.text) CFX_sendWhatsAppText(ev.from, result.text);
}

function CFX_sendWhatsAppText(to, text) {
  var wa = CFX_getWhatsAppConfig();
  to = CFX_waNormalize(to);
  text = CFX_clean(text);

  if (!wa.autoReply) return { ok: false, skipped: true, reason: 'RESPUESTA_AUTO_OFF' };

  if (wa.mode === 'SOLO_REGISTRO') {
    CFX_log('WA_SOLO_REGISTRO', 'No se envía mensaje', { to: to, text: CFX_truncate(text, 500) });
    return { ok: true, skipped: true, reason: 'SOLO_REGISTRO' };
  }

  if (wa.mode === 'LINKS') {
    CFX_append(CFX_SHEETS.QUEUE, [
      CFX_nextId(CFX_SHEETS.QUEUE, 1, 'MEN'),
      CFX_now(),
      'WA_LINK',
      to,
      text,
      CFX_waLink(to, text),
      'PENDIENTE',
      '',
      '',
      'Modo LINKS'
    ]);
    return { ok: true, queued: true };
  }

  if (!wa.accessToken || !wa.phoneNumberId) {
    CFX_log('WA_NO_CREDENTIALS', 'Faltan credenciales de WhatsApp API', { to: to });
    return { ok: false, error: 'Faltan credenciales WhatsApp API' };
  }

  var url = 'https://graph.facebook.com/' + wa.graphVersion + '/' + wa.phoneNumberId + '/messages';
  var payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: { preview_url: true, body: text }
  };

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + wa.accessToken },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    if (code < 200 || code >= 300) {
      CFX_error('CFX_sendWhatsAppText', new Error('WA HTTP ' + code + ': ' + body), { to: to });
      return { ok: false, code: code, body: body };
    }
    CFX_log('WA_SEND_OK', 'Mensaje enviado', { to: to, response: CFX_truncate(body, 1000) });
    return { ok: true, code: code, body: body };
  } catch (err) {
    CFX_error('CFX_sendWhatsAppText', err, { to: to });
    return { ok: false, error: err.message };
  }
}
