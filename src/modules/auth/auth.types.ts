/**
 * Tipos internos del módulo de autenticación.
 *
 * Nota: Los tipos de sesión expuestos a toda la app viven en
 * `src/types/next-auth.d.ts` (module augmentation de Auth.js).
 * Los tipos aquí son internos al módulo auth.
 */

import type { UserRole } from "@/constants/levels";
import type { SessionUser } from "@/types";

/** Perfil de Google OAuth tal como lo recibe Auth.js en el callback signIn. */
export interface GoogleProfile {
  sub: string;       // ID único de Google
  name: string;
  email: string;
  picture?: string;  // URL del avatar
  hd?: string;       // Hosted domain (dominio de Google Workspace)
}

/** Resultado de la verificación de dominio institucional. */
export interface DomainCheckResult {
  allowed: boolean;
  email: string;
  domain: string;
  reason?: "no-domain-configured" | "domain-mismatch" | "allowed";
}

/**
 * Sesión extendida con datos completos del usuario.
 * Re-exporta desde `@/types` para centralizar importaciones en el módulo.
 */
export type { SessionUser };

/** Payload que se guarda en el JWT (token cifrado en cookie). */
export interface JwtPayload {
  id: string;
  role: UserRole;
  email: string;
  name?: string | null;
  image?: string | null;
}
