import { prisma } from "@/lib/prisma/client";

const SETTINGS_ROW_ID = "singleton";
const CACHE_TTL_MS = 8000;

export interface MaintenanceModeState {
  enabled:      boolean;
  message:      string | null;
  enabledAt:    string | null;
  enabledBy:    string | null;
}

let cache: { value: MaintenanceModeState; expiresAt: number } | null = null;

/**
 * Estado del modo mantenimiento, con cache en memoria de corta duración.
 *
 * proxy.ts consulta esta función en cada request de Docente/Coordinador —
 * cachear evita un round-trip a la base de datos por cada navegación/acción
 * en un servidor de un solo proceso Node.js. El TTL corto (8s) es aceptable
 * porque esta función se activa/desactiva manualmente y de forma poco
 * frecuente (a diferencia de un dato que cambia constantemente).
 */
export async function getMaintenanceMode(): Promise<MaintenanceModeState> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  const row = await prisma.systemSetting.findUnique({ where: { id: SETTINGS_ROW_ID } });

  const value: MaintenanceModeState = {
    enabled:   row?.maintenanceModeEnabled ?? false,
    message:   row?.maintenanceMessage ?? null,
    enabledAt: row?.maintenanceEnabledAt?.toISOString() ?? null,
    enabledBy: row?.maintenanceEnabledBy ?? null,
  };

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function setMaintenanceMode(
  enabled: boolean,
  message: string | null,
  actorId: string,
): Promise<void> {
  await prisma.systemSetting.upsert({
    where:  { id: SETTINGS_ROW_ID },
    create: {
      id: SETTINGS_ROW_ID,
      maintenanceModeEnabled: enabled,
      maintenanceMessage:     message,
      maintenanceEnabledAt:   enabled ? new Date() : null,
      maintenanceEnabledBy:   actorId,
    },
    update: {
      maintenanceModeEnabled: enabled,
      maintenanceMessage:     message,
      maintenanceEnabledAt:   enabled ? new Date() : null,
      maintenanceEnabledBy:   actorId,
    },
  });

  // Invalida el cache de inmediato — no hace falta esperar al TTL.
  cache = null;
}

export const systemSettingsService = { getMaintenanceMode, setMaintenanceMode };
