import { prisma } from "@/lib/prisma/client";

export interface RateLimitResult {
  allowed:   boolean;
  remaining: number;
  resetAt:   Date;
}

// Límites predefinidos para reutilizar en toda la app
export const RATE_LIMITS = {
  LOGIN:          { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 intentos / 15 min
  SA_CREATE_USER: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 creaciones / hora
  SA_RESET_PASS:  { limit:  5, windowMs: 60 * 60 * 1000 }, // 5 resets / hora
} as const;

export const rateLimitService = {
  /**
   * Verifica e incrementa el contador para la clave dada.
   * Falla abierto (permite) si la BD no está disponible — el rate limiting
   * no debe bloquear usuarios legítimos ante fallos de infraestructura.
   */
  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = new Date();

    try {
      return await prisma.$transaction(async (tx) => {
        const record = await tx.rateLimit.findUnique({ where: { key } });

        const windowCutoff = new Date(now.getTime() - windowMs);

        // Sin registro o ventana expirada → reiniciar
        if (!record || record.windowStart < windowCutoff) {
          await tx.rateLimit.upsert({
            where:  { key },
            create: { key, windowStart: now, count: 1 },
            update: { windowStart: now, count: 1 },
          });
          return {
            allowed:   true,
            remaining: limit - 1,
            resetAt:   new Date(now.getTime() + windowMs),
          };
        }

        // Dentro de la ventana activa — límite alcanzado
        if (record.count >= limit) {
          return {
            allowed:   false,
            remaining: 0,
            resetAt:   new Date(record.windowStart.getTime() + windowMs),
          };
        }

        // Dentro del límite → incrementar
        await tx.rateLimit.update({
          where: { key },
          data:  { count: { increment: 1 } },
        });
        return {
          allowed:   true,
          remaining: limit - record.count - 1,
          resetAt:   new Date(record.windowStart.getTime() + windowMs),
        };
      });
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
