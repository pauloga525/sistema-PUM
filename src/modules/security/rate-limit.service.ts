import { prisma } from "@/lib/prisma/client";

export interface RateLimitResult {
  allowed:   boolean;
  remaining: number;
  resetAt:   Date;
}

// Límites predefinidos para reutilizar en toda la app
export const RATE_LIMITS = {
  LOGIN_EMAIL_IP: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 intentos por email+IP / 15 min
  LOGIN_IP:       { limit: 50, windowMs: 15 * 60 * 1000 }, // 50 intentos por IP / 15 min
  LOGIN_EMAIL:    { limit: 50, windowMs: 15 * 60 * 1000 }, // 50 intentos por email (todas las IP) / 15 min
  SA_CREATE_USER: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 creaciones / hora
  SA_RESET_PASS:  { limit:  5, windowMs: 60 * 60 * 1000 }, // 5 resets / hora
} as const;

export const rateLimitService = {
  /**
   * Incrementa y verifica el contador para la clave dada en una sola sentencia
   * atómica (INSERT ... ON CONFLICT), sin carreras entre peticiones concurrentes.
   * Si la ventana expiró, el contador se reinicia a 1.
   *
   * Falla abierto (permite) si la BD no está disponible — el rate limiting
   * no debe bloquear usuarios legítimos ante fallos de infraestructura (y sin BD
   * tampoco se puede validar la contraseña, así que no abre una vía de ataque).
   */
  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now          = new Date();
    const windowCutoff = new Date(now.getTime() - windowMs);

    try {
      const rows = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
        INSERT INTO "rate_limits" ("key", "windowStart", "count")
        VALUES (${key}, ${now}, 1)
        ON CONFLICT ("key") DO UPDATE SET
          "count"       = CASE WHEN "rate_limits"."windowStart" < ${windowCutoff} THEN 1 ELSE "rate_limits"."count" + 1 END,
          "windowStart" = CASE WHEN "rate_limits"."windowStart" < ${windowCutoff} THEN ${now} ELSE "rate_limits"."windowStart" END
        RETURNING "count", "windowStart"
      `;
      const { count, windowStart } = rows[0];
      return {
        allowed:   count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt:   new Date(new Date(windowStart).getTime() + windowMs),
      };
    } catch {
      // Fail open — nunca bloquear por fallos de BD
      return { allowed: true, remaining: 1, resetAt: new Date(now.getTime() + windowMs) };
    }
  },

  /** Reinicia manualmente el contador de una clave (útil en tests o desbloqueos manuales). */
  async reset(key: string): Promise<void> {
    await prisma.rateLimit.deleteMany({ where: { key } });
  },

  /** Elimina registros con ventana expirada hace más de `maxAgeMs`. Llamar en mantenimiento. */
  async clearExpired(maxAgeMs = 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const { count } = await prisma.rateLimit.deleteMany({
      where: { windowStart: { lt: cutoff } },
    });
    return count;
  },
};
