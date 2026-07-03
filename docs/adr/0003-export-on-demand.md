# ADR 0003 — Exportación de documentos siempre bajo demanda

**Estado:** Aceptado  
**Fecha:** 2026-06-15

## Contexto

El sistema debe generar documentos Word y PDF idénticos a la plantilla oficial (`Formato 1.0 PUM Inteligente.docm`). Se debe decidir si estos documentos se pre-generan y almacenan, o se generan en tiempo real cuando se solicitan.

## Decisión

Los documentos se generan **siempre bajo demanda** (on-demand) cada vez que se solicitan. **Ningún archivo Word o PDF se almacena de forma permanente** en el servidor de la aplicación.

## Razones

1. **Consistencia garantizada**: El documento generado siempre refleja el estado actual de los datos. No hay riesgo de "documento obsoleto" vs. datos actuales.
2. **Simplicidad de arquitectura**: No se necesita un sistema de almacenamiento de archivos (S3, disco gestionado). Reduce costos y puntos de fallo.
3. **Sin sincronización**: No hay que sincronizar "versión del documento" con "versión de los datos".
4. **Privacidad**: Los datos personales de docentes no persisten en archivos fuera de la BD.

## Flujo técnico

```
Request → ExportService.build() → DocxBuilder/PdfBuilder → Buffer en memoria → Response stream
```

El buffer existe solo durante el tiempo de request. Al enviar el stream, se descarta.

## Alternativas descartadas

| Alternativa | Motivo del descarte |
|---|---|
| Pre-generar al finalizar | Requiere almacenamiento de archivos, sincronización, gestión de versiones |
| Cachear documentos en Redis | Los datos cambian frecuentemente; la caché requeriría invalidación compleja |
| Almacenar en S3/MinIO | Agrega una dependencia de infraestructura innecesaria para un colegio único |

## Consecuencias

- **Positivo**: Arquitectura simple, documentos siempre frescos, sin gestión de archivos.
- **Negativo**: El export masivo de muchos docentes puede ser lento.
- **Mitigación**: Para exports masivos (admin), usar jobs asíncronos con BullMQ (Fase 4). Los exports individuales son rápidos (1 documento < 2 segundos).
