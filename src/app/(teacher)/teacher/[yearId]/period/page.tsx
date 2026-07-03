import { redirect } from "next/navigation";

export default async function PeriodPage({
  params,
}: {
  params: Promise<{ yearId: string }>;
}) {
  const { yearId } = await params;
  redirect(`/teacher/${yearId}/subjects`);
}
