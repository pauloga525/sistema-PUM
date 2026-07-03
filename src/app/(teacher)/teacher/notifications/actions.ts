"use server";

import { auth } from "@/auth";
import { notificationsService, type PumNotification } from "@/modules/notifications/notifications.service";

export async function getTeacherNotificationsAction(): Promise<PumNotification[]> {
  const session = await auth();
  if (!session) return [];
  return notificationsService.getTeacherNotifications(session.user.id);
}
