# ADR 0007 — Usar Zod para validación de datos de entrada

**Estado:** Aceptado  
**Fecha:** 2026-06-15

## Contexto

Todos los datos que ingresan al sistema desde el exterior (formularios de docentes, parámetros de URL, body de API routes) deben validarse antes de procesarse. TypeScript valida en tiempo de compilación, no en tiempo de ejecución.

## Decisión

Usar **Zod** para toda validación de datos de entrada en servidor.

Convención:
- Los schemas Zod viven en `*.schema.ts` dentro del módulo correspondiente.
- Los tipos TypeScript se **infieren** desde el schema con `z.infer<typeof Schema>` (no se duplican).
- La validación se ejecuta en Server Actions y API Routes antes de llamar a los servicios.

## Razones

1. **Runtime safety**: Los datos reales que llegan del cliente pueden ser cualquier cosa, independientemente de los tipos TypeScript del frontend.
2. **Mensajes de error legibles**: Zod genera mensajes de error en español configurables, listos para mostrar al usuario.
3. **Fuente única de verdad**: El schema define tanto la validación como el tipo TypeScript. No hay duplicación.
4. **Composición**: Los schemas se pueden reutilizar y componer (`z.object`, `z.array`, `.merge`, `.extend`).

## Uso correcto

```typescript
// En un Server Action:
const result = SavePlanificationRowsSchema.safeParse(formData);
if (!result.success) {
  throw new ValidationError(result.error.flatten().fieldErrors);
}
// result.data está tipado correctamente aquí
await planificationService.saveRows(result.data, session.user.id);
```

## Consecuencias

- **Positivo**: Seguridad en la frontera del sistema; errores claros para el usuario.
- **Negativo**: Agrega boilerplate de validación en cada punto de entrada.
- **Aceptado**: Es boilerplate necesario para un sistema que maneja datos institucionales.
