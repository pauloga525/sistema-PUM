import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function SuperAdminRootPage() {
  redirect(ROUTES.SUPERADMIN.USERS);
}
