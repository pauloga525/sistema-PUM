# ADR 0005 — Usar Google OAuth con restricción de dominio institucional

**Estado:** Aceptado  
**Fecha:** 2026-06-15

## Contexto

El sistema requiere autenticación de docentes y administradores. Se debe elegir entre autenticación propia (usuario/contraseña) o federar con un proveedor de identidad existente.

## Decisión

Usar **Google OAuth vía Auth.js v5** con restricción de dominio institucional (`ALLOWED_EMAIL_DOMAIN`).

## Razones

1. **Sin gestión de contraseñas**: No se almacenan contraseñas en la BD. Elimina riesgos de seguridad asociados (hash débil, fuerza bruta, reset de contraseñas).
2. **El colegio ya usa Google Workspace**: Los docentes ya tienen cuentas `@colegio.edu.ec` de Google. No necesitan recordar otra contraseña.
3. **Restricción de dominio**: `checkEmailDomain()` en `auth.guards.ts` garantiza que solo emails del colegio puedan autenticarse, sin necesidad de aprobar cada usuario manualmente.
4. **Auth.js v5**: Compatible con Next.js App Router, maneja sesiones server-side, no expone tokens al cliente.

## Alternativas descartadas

| Alternativa | Motivo del descarte |
|---|---|
| Usuario/contraseña propia | Requiere gestión de hash, reset, recuperación; más superficie de ataque |
| LDAP/Active Directory | Infraestructura adicional; más complejo de mantener |
| Auth0/Okta | Costo mensual; dependencia de proveedor externo |

## Consecuencias

- **Positivo**: Seguridad delegada a Google, cero gestión de contraseñas, UX familiar para docentes.
- **Negativo**: Requiere conexión a internet para autenticarse (sin Google = sin acceso).
- **Mitigación**: Si el colegio necesita operar sin internet, evaluar LDAP en Fase 3.

## Configuración requerida

1. Crear proyecto en Google Cloud Console
2. Activar Google OAuth API
3. Configurar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env.local`
4. Establecer `ALLOWED_EMAIL_DOMAIN=colegio.edu.ec` en producción
