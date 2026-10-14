import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { adminCatalogService } from "@/modules/admin/admin-catalog.service";
import { ROUTES } from "@/constants/routes";
import { CatalogClient } from "@/components/admin/catalog/CatalogClient";

export const metadata = { title: "Catálogo — Admin PUM" };

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);

  const { year } = await searchParams;
  const data = await adminCatalogService.getFullCatalogData(year);

  return (
    <CatalogClient
      years={data.years}
      levels={data.levels}
      subjects={data.subjects}
    />
  );
}
