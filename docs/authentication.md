# Autenticación — PUM Web

**Última actualización:** 2026-10-14

## Proveedor

Auth.js v5 con el provider **Credentials** (correo + contraseña) y sesión
**JWT** en cookie httpOnly. Ver ADR 0008 (reemplaza a la 0005, Google OAuth).

## Cuentas

- Las crean Admin (docentes y coordinadores) o SuperAdmin (cualquier rol).
- Al crearla o restablecerla se genera una **contraseña temporal** aleatoria
  (`xxxx-xxxx-xxxx`) que se muestra una sola vez y vence a los 7 días.
- Con contraseña temporal, el usuario debe cambiarla antes de usar el sistema
  (el proxy lo lleva a la página de cambio). La nueva debe tener entre 10 y
  128 caracteres y no puede contener la cédula ni ser igual al correo.
- "Eliminar" un docente o coordinador lo **desactiva**; SuperAdmin puede
  reactivarlo.

## Login

`src/auth.ts` → `authorize()`:

1. Límite de intentos: 10 por correo+IP, 50 por IP y 50 por correo en 15 min
   (tabla `rate_limits`).
2. Comparación bcrypt (también contra un hash de relleno si el correo no
   existe, para no revelar qué cuentas existen por el tiempo de respuesta).
3. Rechaza cuentas desactivadas y contraseñas temporales vencidas.
4. Cada intento queda en `user_audit_logs`.

## Sesión

- El JWT se revalida contra la BD cada 60 s: si la cuenta se desactivó o la
  contraseña cambió, la sesión se invalida. El rol se sincroniza.
- Duración: 8 h deslizantes (`SESSION_MAX_AGE`) y 12 h como máximo desde el
  login.

## Protección de rutas

| Capa | Qué hace |
|---|---|
| `src/proxy.ts` | Exige sesión, redirige por rol, aplica modo mantenimiento y cambio obligatorio de contraseña, agrega CSP con nonce |
| `requireActiveSession()` (`src/lib/auth/session.ts`) | En cada server action y route handler: sesión vigente, sin cambio de contraseña pendiente ni mantenimiento |
| Servicios | Verifican acceso al recurso concreto (p. ej. `_coordinatorCanAccessPlan`) |

## Cuentas de prueba

Solo con `ENABLE_DEV_USERS=true` y `NODE_ENV` distinto de `production`:
`docente@test.com`, `coordinador@test.com`, `admin@test.com`,
`superadmin@test.com` (contraseña: el nombre antes de la @ + `123`).

## Variables

`AUTH_SECRET` (obligatoria en producción, mínimo 32 caracteres), `AUTH_URL`,
`SESSION_MAX_AGE`, `ENABLE_DEV_USERS`. Ver `.env.example`.
