import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function CoordinatorRootPage() {
  redirect(ROUTES.COORDINATOR.RETROALIMENTACION);
}
