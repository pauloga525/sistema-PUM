/**
 * Route handler de Auth.js v5 para Next.js App Router.
 *
 * Esta ruta captura TODOS los paths bajo /api/auth/:
 *   GET  /api/auth/signin          → página de inicio de sesión (Auth.js)
 *   GET  /api/auth/signout         → cierre de sesión
 *   GET  /api/auth/callback/google → callback OAuth de Google
 *   GET  /api/auth/session         → datos de sesión actual (JSON)
 *   GET  /api/auth/csrf            → token CSRF
 *   GET  /api/auth/providers       → lista de providers configurados
 *
 * El patrón [...nextauth] es un "catch-all" route de Next.js.
 * Auth.js maneja internamente cada sub-ruta según el método HTTP.
 *
 * No modificar este archivo — toda la lógica está en src/auth.ts.
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
