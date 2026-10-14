/**
 * Extensión de tipos de Auth.js v5 para PUM Web.
 *
 * Por qué este archivo es necesario:
 *   Auth.js define tipos base para `Session` y `User` que no incluyen
 *   nuestros campos personalizados (id y role). TypeScript no permitiría
 *   acceder a `session.user.id` o `session.user.role` sin esta declaración.
 *
 * El patrón `declare module "next-auth"` es "module augmentation" de TypeScript:
 *   permite extender interfaces de librerías de terceros sin modificarlas.
 *
 * Estos tipos se aplican automáticamente en todo el proyecto al importar
 * cualquier cosa de "next-auth".
 */

import type { DefaultSession } from "next-auth"
import type { UserRole } from "@/constants/levels"

declare module "next-auth" {
  /**
   * Extiende la sesión con campos personalizados del usuario.
   * `DefaultSession["user"]` ya incluye: name, email, image.
   * Agregamos: id, role, y forcePasswordChange (primer login).
   */
  interface Session {
    user: {
      id: string
      role: UserRole
      forcePasswordChange: boolean
    } & DefaultSession["user"]
  }

  /**
   * Extiende el User de Auth.js para incluir el rol y el flag de primer login.
   * Esta interface describe el objeto `user` que llega al callback `jwt`.
   */
  interface User {
    role?: UserRole
    forcePasswordChange?: boolean
    /** Huella del hash de contraseña al iniciar sesión (solo usuarios de BD). */
    passwordFingerprint?: string
  }
}

// El callback `jwt` usa el tipo de @auth/core/jwt (next-auth/jwt lo reexporta).
declare module "@auth/core/jwt" {
  /**
   * Extiende el JWT para incluir los datos adicionales del usuario
   * que se guardan en el token cifrado.
   */
  interface JWT {
    id?: string
    role?: UserRole
    forcePasswordChange?: boolean
    /** Huella del hash de contraseña; si cambia en la BD, la sesión se invalida. */
    passwordFingerprint?: string
    /** Cuenta de prueba (DEV_USERS), sin registro en la BD. */
    isDevUser?: boolean
    /** Momento del login (ms) — límite absoluto de la sesión. */
    loginAt?: number
    /** Última revalidación contra la BD (ms). */
    checkedAt?: number
  }
}
