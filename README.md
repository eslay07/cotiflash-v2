# CotiFlash v2

## Lectura rápida para evaluar el proyecto

Automatiza el recorrido de solicitud por WhatsApp, búsqueda de productos y cotización PDF desde Google Sheets.

**Tecnologías:** Google Apps Script · JavaScript · Groq · WhatsApp Cloud API
**Estado:** Requiere recursos de Google y credenciales de servicios propios. La guía recomienda una copia por cliente; no debe presentarse como aislamiento multiempresa ya verificado.

[Ver el problema, la evidencia de implementación y las limitaciones](PORTFOLIO.md) · [Portafolio del autor](https://github.com/eslay07)


Aplicación de Google Apps Script para recibir solicitudes por WhatsApp, interpretar productos con Groq, consultar un catálogo en Google Sheets y generar cotizaciones en PDF.

Los secretos se guardan mediante `PropertiesService`; no deben escribirse en el código. Antes de desplegar, configura en el proyecto de Apps Script las propiedades de Groq y WhatsApp y sustituye todos los IDs de ejemplo por recursos propios.

La guía funcional original está en `README_IMPLEMENTACION.md`. La procedencia está documentada en `PROVENIENCIA.md` y los comandos de Git/GitHub en `PASOS_GIT_GITHUB.txt`.
