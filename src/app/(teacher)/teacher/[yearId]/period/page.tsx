import { ROUTES } from "@/constants/routes";
import { redirect } from "next/navigation";

export default async function PeriodPage({
  params,
}: {
  params: Promise<{ yearId: string }>;
}) {
  const { yearId } = await params;
  redirect(ROUTES.TEACHER.subjectsYear(yearId));
}
