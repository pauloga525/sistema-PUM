/**
 * Exporta la lista de docentes a Excel.
 * Excluye las cuentas de prueba (admin@test.com, superadmin@test.com).
 * Uso: npx dotenvx run -- npx ts-node --skip-project scripts/export-teachers-excel.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import ExcelJS from "exceljs";
import path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

const EXCLUDE_EMAILS = ["admin@test.com", "superadmin@test.com"];

async function main() {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      email: { notIn: EXCLUDE_EMAILS },
      role: { in: ["TEACHER", "COORDINATOR", "ADMIN"] },
    },
    orderBy: { name: "asc" },
    select: { name: true, email: true, cedula: true, role: true },
  });

  console.log(`✓ ${users.length} usuarios encontrados`);

  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Docentes");

  // ── Encabezados ────────────────────────────────────────────────────────────
  worksheet.columns = [
    { header: "N°",      key: "num",    width: 6  },
    { header: "Nombre",  key: "name",   width: 40 },
    { header: "Correo",  key: "email",  width: 36 },
    { header: "CI",      key: "cedula", width: 16 },
    { header: "Rol",     key: "role",   width: 14 },
  ];

  // Estilo de encabezado
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border    = {
      bottom: { style: "thin", color: { argb: "FF1E3A5F" } },
    };
  });
  headerRow.height = 22;

  // ── Datos ──────────────────────────────────────────────────────────────────
  users.forEach((u, i) => {
    const row = worksheet.addRow({
      num:    i + 1,
      name:   u.name,
      email:  u.email,
      cedula: u.cedula,
      role:   u.role,
    });

    // Filas alternas
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4F8" } };
      });
    }

    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle" };
      cell.border = {
        bottom: { style: "hair", color: { argb: "FFD1D5DB" } },
      };
    });

    row.height = 18;
  });

  // Alinear N° al centro
  worksheet.getColumn("num").alignment = { horizontal: "center", vertical: "middle" };

  // Congela la fila de encabezado
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // ── Guardar ────────────────────────────────────────────────────────────────
  const outPath = path.join(process.cwd(), "docentes_acceso.xlsx");
  await workbook.xlsx.writeFile(outPath);
  console.log(`✓ Archivo generado: ${outPath}`);
}

main()
  .catch((e) => { console.error("✗ Error:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
