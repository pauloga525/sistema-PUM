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
  }
}

declare module "next-auth/jwt" {
  /**
   * Extiende el JWT para incluir los datos adicionales del usuario
   * que se guardan en el token cifrado.
   */
  interface JWT {
    id?: string
    role?: UserRole
    forcePasswordChange?: boolean
  }
}
