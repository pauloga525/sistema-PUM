"use server";

import { auth } from "@/auth";
import { notificationsService, type PumNotification } from "@/modules/notifications/notifications.service";

export async function getCoordinatorNotificationsAction(): Promise<PumNotification[]> {
  const session = await auth();
  if (!session) return [];
  if (session.user.role !== "COORDINATOR") return [];
  return notificationsService.getCoordinatorNotifications(session.user.id);
}
