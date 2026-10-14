# ADR 0008 — Autenticación con credenciales propias

**Estado:** Aceptado (reemplaza a ADR 0005)
**Fecha:** 2026-10-14

## Contexto

La ADR 0005 planteaba Google OAuth con restricción de dominio. El sistema se
implementó con usuario y contraseña (provider Credentials de Auth.js) y así
está en producción; esta ADR registra esa decisión y sus salvaguardas.

## Decisión

Cuentas creadas por la administración, con contraseña propia guardada como hash
bcrypt y sesión JWT.

## Salvaguardas

- Contraseña inicial y de restablecimiento aleatoria, de un solo uso visible y
  con vencimiento (7 días); cambio obligatorio al primer ingreso.
- Límite de intentos por correo+IP, IP y correo.
- Sesión revalidada contra la BD cada 60 s y con duración máxima absoluta.
- Auditoría de accesos y acciones administrativas.

## Consecuencias

- El colegio administra las contraseñas (restablecimiento vía Admin).
- Migrar a Google OAuth sigue siendo posible: el TODO al final de
  `src/auth.ts` resume los pasos.
