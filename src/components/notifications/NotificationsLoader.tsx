import type { PumNotification } from "@/modules/notifications/notifications.service";
import { NotificationModal } from "./NotificationModal";

/**
 * Carga las notificaciones en el servidor. Se usa dentro de <Suspense> en los
 * layouts para no retrasar el resto de la página.
 */
export async function NotificationsLoader({ load }: { load: () => Promise<PumNotification[]> }) {
  const notifications = await load();
  return <NotificationModal notifications={notifications} />;
}
