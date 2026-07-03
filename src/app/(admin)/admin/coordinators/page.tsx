import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { adminService } from "@/modules/admin/admin.service";
import { CoordinatorsClient } from "@/components/admin/CoordinatorsClient";

export const metadata = { title: "Coordinadores — Admin PUM" };

export default async function CoordinatorsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect(ROUTES.LOGIN);

  const [coordinators, teachers, subjects] = await Promise.all([
    adminService.getCoordinators(),
    adminService.getTeachersForCoordinatorPanel(),
    adminService.getSubjectsForAdminPanel(),
  ]);

  return (
    <CoordinatorsClient
      coordinators={coordinators}
      teachers={teachers}
      subjects={subjects}
    />
  );
}
