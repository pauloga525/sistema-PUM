# Servicio de Exportación — PUM Web

**Última actualización:** 2026-06-15 (Fase 1 — skeleton)  
**Implementación prevista:** Fase 3

## Principio

Los documentos Word y PDF se generan **siempre bajo demanda** en memoria. Nunca se persisten en el servidor de la aplicación. Ver ADR 0003.

## Pipeline de exportación

```
Request
  ↓
/api/export/:planId?format=docx|pdf
  ↓
ExportService.build(request)
  ↓
PlanificationService.getById() → cargar datos de PostgreSQL
  ↓
DocxBuilder.build(data, templatePath, imagesPath)
  → Leer plantilla .docm del servidor
  → Sustituir placeholders con datos de la planificación
  → Insertar imágenes de metodología (PNG)
  → Devolver Buffer DOCX en memoria
  ↓
[Si format=pdf]
PdfBuilder.fromDocx(docxBuffer) → Buffer PDF
  ↓
Response con Content-Disposition: attachment; filename=...
  ↓
Buffer descartado (no se guarda)
```

## Export masivo (ZIP)

Para el admin exportando múltiples planificaciones:

```
ExportService.buildZip(filter)
  ↓
Para cada planificación que coincida con filter:
  ExportService.build() → buffer
  Agregar al ZIP (ZipBuilder)
  ↓
ZIP en memoria o temp con TTL 24h
  ↓
Response ZIP descargable
```

## Estructura de archivos en NAS (FTP)

```
{año_lectivo}/
  {materia}/
    {nivel}/
      {materia}_{nivel}_{docente}_{periodo}.docx
      {materia}_{nivel}_{docente}_{periodo}.pdf
```

Ejemplo:
```
2026-2027/
  Matemáticas/
    3ro-Bachillerato/
      Matematicas_3ro-Bachillerato_Perez-Juan_Q1.docx
      Matematicas_3ro-Bachillerato_Perez-Juan_Q1.pdf
```

## Assets del servidor (no en BD)

| Asset | Ubicación | Uso |
|---|---|---|
| Plantilla Word | `assets/template/Formato_PUM.docm` | Base de todos los documentos |
| Imágenes PNG | `assets/images/PUM_Images/` | Iconos de metodología (26 archivos) |

## Módulos relevantes

| Archivo | Propósito |
|---|---|
| `src/modules/export/export.service.ts` | Orquestador principal |
| `src/modules/export/export.types.ts` | Tipos de request/result |
| `src/modules/ftp/ftp.service.ts` | Subida al NAS |
| `src/config/export.config.ts` | Configuración FTP y rutas de assets |
