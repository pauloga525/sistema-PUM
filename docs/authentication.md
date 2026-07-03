# Autenticación — PUM Web

**Última actualización:** 2026-06-15 (Fase 1)

## Proveedor

**Auth.js v5** con provider **Google OAuth**.

La restricción de dominio institucional garantiza que solo emails `@[ALLOWED_EMAIL_DOMAIN]` puedan autenticarse.

## Flujo OAuth

```
1. Usuario abre /login
2. Clic en "Iniciar sesión con Google"
3. Redirección a Google OAuth consent
4. Google devuelve token + perfil al callback
5. Auth.js verifica dominio de email
6. Auth.js crea o actualiza usuario en BD (upsert)
7. Sesión server-side creada (cookie httpOnly)
8. Redirección a /teacher/year o /admin/dashboard según rol
```

## Roles

| Rol | Acceso | Cómo se asigna |
|---|---|---|
| `TEACHER` | Flujo docente + export individual | Por defecto al crear usuario |
| `ADMIN` | Panel admin + export masivo + FTP | Manualmente por DBA o script |

## Protección de rutas

### Middleware de Next.js

`src/middleware.ts` (Fase 2) protegerá todas las rutas que empiecen con `/teacher` y `/admin`. Si no hay sesión, redirige a `/login`.

### Guards en servicios

Los servicios usan `requireAuth()` y `requireRole()` de `src/modules/auth/auth.guards.ts` como segunda línea de defensa.

## Archivos relevantes

| Archivo | Propósito |
|---|---|
| `src/modules/auth/auth.guards.ts` | Funciones `requireAuth`, `requireRole`, `checkEmailDomain` |
| `src/modules/auth/auth.types.ts` | Tipos de sesión y perfil Google |
| `src/config/auth.config.ts` | Variables de entorno de Auth |
| `src/app/api/auth/[...nextauth]/route.ts` | Handler de Auth.js (Fase 2) |

## Configuración requerida

Ver `.env.example` para las variables de entorno necesarias:
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ALLOWED_EMAIL_DOMAIN`
