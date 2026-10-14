"use server";

import { requireActiveSession } from "@/lib/auth/session";
import { notificationsService, type PumNotification } from "@/modules/notifications/notifications.service";

export async function getCoordinatorNotificationsAction(): Promise<PumNotification[]> {
  const session = await requireActiveSession();
  if (!session) return [];
  if (session.user.role !== "COORDINATOR") return [];
  return notificationsService.getCoordinatorNotifications(session.user.id);
}
