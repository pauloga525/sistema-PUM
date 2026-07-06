import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function RootPage() {
  let session = null;

  try {
    session = await auth();
  } catch {
    // Si auth() falla (DB no disponible, NEXTAUTH_SECRET ausente, etc.)
    // mostramos la landing pública en lugar de un 404/500.
    return <LandingPage />;
  }

  if (session?.user) {
    switch (session.user.role) {
      case "ADMIN":
        redirect(ROUTES.ADMIN.DASHBOARD);
      case "SUPERADMIN":
        redirect(ROUTES.SUPERADMIN.DASHBOARD);
      case "COORDINATOR":
        redirect(ROUTES.COORDINATOR.RETROALIMENTACION);
      default:
        redirect(ROUTES.TEACHER.YEAR);
    }
  }

  return <LandingPage />;
}
