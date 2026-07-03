# ADR 0004 — No almacenar archivos en la base de datos

**Estado:** Aceptado  
**Fecha:** 2026-06-15

## Contexto

PostgreSQL permite almacenar binarios grandes con el tipo `bytea` o `lo` (large object). Se debe decidir si los documentos generados (Word, PDF) o las imágenes pedagógicas se almacenan en la BD.

## Decisión

**La base de datos almacena ÚNICAMENTE información estructurada**:
- Metadatos de planificaciones (estado, fechas, IDs de relaciones)
- Filas de la tabla PUM (texto por columna, iconos seleccionados)
- Usuarios, asignaciones, años lectivos, períodos

**No se almacena en la BD**:
- Archivos Word o PDF (generados bajo demanda)
- Imágenes PNG pedagógicas (en directorio del servidor, read-only)
- Plantilla Word oficial (en directorio del servidor, read-only)

## Razones

1. **Performance**: Los blobs en PostgreSQL degradan el performance de queries de datos. El WAL (Write-Ahead Log) crece masivamente con binarios.
2. **Backup**: Backups de BD son más pequeños y rápidos al no incluir binarios.
3. **Coherencia de datos vs. archivos**: Los documentos son derivados de los datos. Almacenar ambos crea redundancia que puede desincronizarse.
4. **Principio de responsabilidad única**: La BD es la fuente de verdad de datos; el sistema de archivos es la fuente de verdad de assets estáticos.

## Consecuencias

- **Positivo**: BD liviana, queries rápidas, backups simples.
- **Negativo**: No hay historial de versiones de documentos exportados.
- **Aceptado**: El historial de datos sí existe (audit log en BD). Los documentos reflejan siempre el estado actual de los datos, que es el comportamiento deseado.
