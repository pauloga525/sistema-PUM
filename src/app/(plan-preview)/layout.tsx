import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/constants/levels";
import type { UserRole } from "@/constants/levels";
import { ROUTES } from "@/constants/routes";

export default async function PlanPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role as UserRole, "ADMIN")) {
    redirect(ROUTES.LOGIN);
  }
  return <>{children}</>;
}
