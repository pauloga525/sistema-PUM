import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/** Vista antigua por periodo: las materias se muestran ahora en la vista anual. */
export default async function PeriodSubjectsRedirect({
  params,
}: {
  params: Promise<{ yearId: string }>;
}) {
  const { yearId } = await params;
  redirect(ROUTES.TEACHER.subjectsYear(yearId));
}
