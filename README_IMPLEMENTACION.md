# CotiFlash v2 PRO GROQ — Implementación

## Qué corrige esta versión

- Código modular por archivos.
- Credenciales fuera de la hoja: `PropertiesService`.
- Función real de envío WhatsApp: `CFX_sendWhatsAppText`.
- Motor de productos más estricto.
- Productos relacionados separados del total principal.
- Confirmación contextual: si el cliente dice “sí” después de una consulta, genera PDF usando el carrito guardado.
- Groq optimizado: primero se filtra catálogo localmente y solo se mandan candidatos pequeños a IA.
- Groq devuelve JSON, no redacta precios ni inventa stock.
- Logs menos peligrosos: payload completo solo con `MODO_DEBUG = SI`.

## Archivos

Copia cada archivo en Apps Script con el mismo nombre:

1. `appsscript.json`
2. `00_BOOTSTRAP.gs`
3. `01_CONSTANTS.gs`
4. `02_UTILS.gs`
5. `03_CONFIG_SECURITY.gs`
6. `04_SHEETS_LOGS.gs`
7. `20_CATALOG_MATCH.gs`
8. `30_GROQ_AI.gs`
9. `31_STATE_CLIENTS.gs`
10. `32_ROUTER.gs`
11. `33_QUOTES_PDF.gs`
12. `40_WHATSAPP_WEBHOOK.gs`
13. `50_ADMIN_API.gs`
14. `90_TESTS.gs`
15. `AdminPanel.html`

## Instalación

1. Abre tu Google Sheet.
2. Extensiones → Apps Script.
3. Borra o respalda el código viejo.
4. Crea los archivos anteriores.
5. Pega el contenido correspondiente.
6. Guarda.
7. Ejecuta `CFX_install`.
8. Autoriza permisos.
9. Recarga el Sheet.
10. Menú `⚡ CotiFlash v2` → `Abrir panel administrativo`.

## Secretos

En el panel, pestaña `Secretos`, pega:

- `Groq API Key`
- `WhatsApp ACCESS_TOKEN`
- `WhatsApp PHONE_NUMBER_ID`
- `WhatsApp VERIFY_TOKEN`

No los pongas en hojas. No los subas a GitHub.

## Webhook WhatsApp

1. Apps Script → Implementar → Nueva implementación.
2. Tipo: Aplicación web.
3. Ejecutar como: tú.
4. Acceso: cualquiera.
5. Copia la URL.
6. En Meta Webhooks:
   - Callback URL: URL de Apps Script.
   - Verify Token: el mismo que pusiste en el panel.
7. Suscribe el campo `messages`.

## Pruebas

Desde Apps Script ejecuta:

- `TEST_CFX_FLOW_LOCAL`
- `TEST_CFX_GROQ`
- `TEST_CFX_PDF`

Desde panel:

- Simular flujo completo.
- Probar solo Groq.

## Recomendación comercial

Para venderlo, crea una copia del Spreadsheet por cliente. No metas varios clientes en una sola hoja todavía.
