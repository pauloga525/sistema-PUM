import { USER_ROLE } from "@/constants/levels";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { adminUsersService } from "@/modules/admin/admin-users.service";
import { adminCatalogService } from "@/modules/admin/admin-catalog.service";
import { CoordinatorsClient } from "@/components/admin/CoordinatorsClient";

export const metadata = { title: "Coordinadores — Admin PUM" };

export default async function CoordinatorsPage() {
  const session = await auth();
  if (!session || session.user.role !== USER_ROLE.ADMIN) redirect(ROUTES.LOGIN);

  const activeYear = await adminCatalogService.getActiveYear();
  const [coordinators, teachers, subjects] = await Promise.all([
    adminUsersService.getCoordinators(activeYear?.id),
    adminUsersService.getTeachersForCoordinatorPanel(),
    adminUsersService.getSubjectsForAdminPanel(),
  ]);

  return (
    <CoordinatorsClient
      coordinators={coordinators}
      teachers={teachers}
      subjects={subjects}
    />
  );
}
