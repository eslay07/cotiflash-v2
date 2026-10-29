# CotiFlash v2 · lectura de portafolio

Automatiza el recorrido de solicitud por WhatsApp, búsqueda de productos y cotización PDF desde Google Sheets.

**Autor:** Jimmy Toapanta · [Perfil profesional](https://www.linkedin.com/in/jimmy-toapanta-950a441b8/) · [Portafolio](https://github.com/eslay07)

**Tecnologías:** Google Apps Script · JavaScript · Groq · WhatsApp Cloud API

## Problema y solución

Interpretar consultas y convertirlas en una cotización implica localizar productos y mantener coherentes catálogo, precios y documento final.

Filtra el catálogo, usa IA para interpretar la solicitud y genera cotizaciones manteniendo el precio y los datos del catálogo como referencia. Separa conversación, PDF, webhook y administración.

## Evidencia para revisar el trabajo

| Archivo o componente | Qué permite revisar |
| --- | --- |
| [20_CATALOG_MATCH.gs](20_CATALOG_MATCH.gs) | Búsqueda y filtrado del catálogo. |
| [30_GROQ_AI.gs](30_GROQ_AI.gs) | Integración configurable con IA. |
| [32_ROUTER.gs](32_ROUTER.gs) | Recorrido de conversación. |
| [33_QUOTES_PDF.gs](33_QUOTES_PDF.gs) | Generación del documento. |
| [40_WHATSAPP_WEBHOOK.gs](40_WHATSAPP_WEBHOOK.gs) | Entrada de mensajes. |
| [90_TESTS.gs](90_TESTS.gs) | Funciones de comprobación del flujo. |

## Estado y límites

Requiere recursos de Google y credenciales de servicios propios. La guía recomienda una copia por cliente; no debe presentarse como aislamiento multiempresa ya verificado.

## Cómo evaluar el proyecto

Usar primero las funciones de prueba local de la guía. Las pruebas con Groq, PDF o WhatsApp pueden consumir servicios o crear documentos y no se ejecutaron aquí.

Esta actualización documental se basa en la revisión del código y de la documentación disponibles. No añade métricas de ahorro, clientes, usuarios ni resultados de producción que no estén respaldados.

## Capacidad que demuestra

Combinar interpretación asistida con reglas deterministas de catálogo y separar el recorrido comercial en componentes.

[Volver al README](README.md).
