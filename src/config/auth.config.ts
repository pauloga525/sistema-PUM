/**
 * Configuración de autenticación (Auth.js v5 / NextAuth).
 *
 * Separado de app.config.ts porque la configuración de Auth se importa
 * tanto en el route handler `/api/auth/[...nextauth]` como en el
 * middleware de Next.js (que corre en Edge Runtime).
 * Mantenerlo liviano (sin imports pesados) garantiza compatibilidad con Edge.
 */
export const authConfig = {
  /** Client ID de la app Google OAuth registrada en Google Cloud Console. */
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",

  /** Client Secret de la app Google OAuth. NUNCA exponer en el cliente. */
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  /** Secret para firmar tokens de sesión. Debe ser una cadena aleatoria larga. */
  authSecret: process.env.AUTH_SECRET ?? "",

  /**
   * Dominio de email institucional que puede autenticarse.
   * Si está vacío, cualquier cuenta Google puede ingresar (solo para desarrollo).
   * En producción DEBE configurarse (ej: "colegio.edu.ec").
   */
  allowedDomain: process.env.ALLOWED_EMAIL_DOMAIN ?? "",

  /** Duración máxima de la sesión en segundos (por defecto: 8 horas). */
  sessionMaxAge: Number(process.env.SESSION_MAX_AGE ?? String(8 * 60 * 60)),
} as const;

export type AuthConfig = typeof authConfig;
