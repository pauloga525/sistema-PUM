import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./support/auth";
import { CATALOG } from "./support/data";
import { getContext, prisma } from "./support/db";
import { DUA_PRINCIPIOS } from "../../src/constants/planification";

/**
 * Paso 1 del PUM: formulario "Datos de la Unidad Microcurricular".
 * Usa un periodo propio (fuera de los del ciclo de vida) y un PUM en borrador
 * sin datos, para llenarlo por la UI y comprobar lo que se guarda.
 */

const PERIOD_NUMBER = 9;
const PERIOD_NAME   = "Periodo E2E Datos";

async function seedDraftPlan(): Promise<{ url: string; planId: string }> {
  const ctx = await getContext();
  const period = await prisma.period.upsert({
    where:  { academicYearId_number: { academicYearId: ctx.year.id, number: PERIOD_NUMBER } },
    update: {},
    create: { academicYearId: ctx.year.id, number: PERIOD_NUMBER, name: PERIOD_NAME },
  });
  await prisma.planification.deleteMany({ where: { periodId: period.id } });
  const plan = await prisma.planification.create({
    data: {
      academicYearId: ctx.year.id,
      periodId:       period.id,
      subjectId:      ctx.subject.id,
      levelId:        ctx.level.id,
      status:         "DRAFT",
      teachers:       { create: { teacherId: ctx.teacher.id, isEditor: true } },
    },
  });
  return { planId: plan.id, url: `/teacher/${ctx.year.id}/${period.id}/planification/${plan.id}` };
}

async function savedMetadata(planId: string) {
  const plan = await prisma.planification.findUniqueOrThrow({ where: { id: planId } });
  return plan.metadata as Record<string, unknown> | null;
}

const textbox = (page: Page, name: string) => page.getByRole("textbox", { name, exact: true });

/** Elige el día indicado del mes visible en el calendario abierto. */
async function pickDay(page: Page, day: number) {
  const calendar = page.getByRole("dialog", { name: /^Calendario/ });
  await expect(calendar).toBeVisible();
  await calendar.getByRole("button", { name: new RegExp(`^\\S+ ${day} de `) }).click();
  await expect(calendar).toHaveCount(0);
}

test.describe("Datos de la unidad (paso 1)", () => {
  test("valida, guarda los datos y los conserva al recargar", async ({ page }) => {
    const { planId, url } = await seedDraftPlan();
    await loginAs(page, "teacher");
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Datos de la Unidad Microcurricular" })).toBeVisible();

    // Sin datos no se puede continuar: errores por campo, asociados al input
    await page.getByRole("button", { name: "Guardar y Continuar →" }).click();
    await expect(page.getByText("Completa los campos requeridos antes de continuar.")).toBeVisible();
    const area = textbox(page, "Área de Estudio");
    await expect(area).toHaveAttribute("aria-invalid", "true");
    await expect(area).toHaveAccessibleDescription("Campo requerido");
    await expect(page.getByText("Ingresa al menos un objetivo")).toBeVisible();
    expect(await savedMetadata(planId)).toBeNull();

    // Identificación
    await area.fill("Matemática");
    await textbox(page, "N° de Unidad").fill("3");
    await textbox(page, "Título de la Unidad").fill("Números enteros");

    // Listas: el primer ítem toma el label del grupo; los siguientes, "Objetivo N"
    await textbox(page, "Objetivos de la Unidad").fill("Objetivo uno");
    await page.getByRole("button", { name: "Agregar objetivo" }).click();
    await textbox(page, "Objetivo 2").fill("Objetivo dos");
    await page.getByRole("button", { name: "Agregar objetivo" }).click();
    await page.getByRole("button", { name: "Eliminar objetivo 3" }).click();
    await textbox(page, "Criterios de Evaluación").fill("Criterio uno");

    // Planificación temporal: fechas por clic y por teclado
    await textbox(page, "N° de Periodos").fill("12");
    const inicio = page.getByRole("combobox", { name: "Fecha de inicio" });
    await inicio.click();
    await pickDay(page, 10);
    await expect(inicio).toHaveValue(/^10\/\d{2}\/\d{4}$/);
    const fin = page.getByRole("combobox", { name: "Fecha de finalización" });
    await fin.focus();
    await page.keyboard.press("Enter");
    await pickDay(page, 20);
    await expect(fin).toHaveValue(/^20\/\d{2}\/\d{4}$/);
    await expect(fin).toBeFocused();
    await textbox(page, "Ejes Transversales").fill("Educación Socioemocional");

    // Aportes y DUA
    await textbox(page, "Dimensión y Opción Transversal, fila 1").fill("Dimensión A");
    await textbox(page, "¿Cómo van a aprender?, fila 1").fill("Trabajo en grupo");
    const principio1 = page.getByRole("group", { name: DUA_PRINCIPIOS[0].label });
    const pauta1 = principio1.getByRole("button", { name: DUA_PRINCIPIOS[0].pautas[0].label });
    await expect(pauta1).toHaveAttribute("aria-expanded", "false");
    await pauta1.click();
    await expect(pauta1).toHaveAttribute("aria-expanded", "true");
    await principio1.getByRole("checkbox", { name: DUA_PRINCIPIOS[0].pautas[0].subPautas[0].label }).check();

    await page.getByRole("button", { name: "Guardar y Continuar →" }).click();
    await expect(page).toHaveURL(new RegExp(`/planification/${planId}/table$`));

    const meta = await savedMetadata(planId);
    expect(meta).toMatchObject({
      areaEstudio:       "Matemática",
      numUnidad:         "3",
      titulo:            "Números enteros",
      objetivos:         ["Objetivo uno", "Objetivo dos"],
      criterios:         ["Criterio uno"],
      nPeriodos:         "12",
      ejesTransversales: "Educación Socioemocional",
      aportes:           [{ dim: "Dimensión A", aporte: "", como: "Trabajo en grupo" }],
      p2:                null,
      p3:                null,
    });
    expect(meta!.fechInicio).toMatch(/^10\/\d{2}\/\d{4}$/);
    expect(meta!.p1).toEqual([{ pauta: 1, subPautas: [1] }]);

    // Al volver al paso 1, los datos se cargan desde la base
    await page.goto(url);
    await expect(textbox(page, "Área de Estudio")).toHaveValue("Matemática");
    await expect(textbox(page, "Objetivo 2")).toHaveValue("Objetivo dos");
    await expect(page.getByRole("combobox", { name: "Fecha de inicio" })).toHaveValue(meta!.fechInicio as string);
    await expect(textbox(page, "Dimensión y Opción Transversal, fila 1")).toHaveValue("Dimensión A");
  });

  test("respeta los límites del servidor y permite editar el nivel educativo", async ({ page }) => {
    const { planId, url } = await seedDraftPlan();
    await loginAs(page, "teacher");
    await page.goto(url);

    // Más largo de lo que acepta el servidor: se marca sin llamar a guardar
    await textbox(page, "N° de Periodos").fill("1".repeat(21));
    await page.getByRole("button", { name: "Solo guardar" }).click();
    await expect(textbox(page, "N° de Periodos")).toHaveAccessibleDescription("Máximo 20 caracteres");
    await expect(page.getByText("Corrige los campos marcados antes de guardar.")).toBeVisible();
    expect(await savedMetadata(planId)).toBeNull();

    // "Solo guardar" no exige los obligatorios
    await textbox(page, "N° de Periodos").fill("8");
    await page.getByRole("button", { name: "Solo guardar" }).click();
    await expect.poll(async () => (await savedMetadata(planId))?.nPeriodos).toBe("8");

    // Nivel educativo: bloqueado hasta confirmar en el diálogo
    const subnivel = textbox(page, "Subnivel");
    await expect(subnivel).toBeDisabled();
    await expect(subnivel).toHaveValue("Educación Básica");
    await expect(textbox(page, "Grados / Nivel")).toHaveValue(CATALOG.levelName);

    await page.getByRole("button", { name: "Editar Nivel Educativo" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Editar Nivel Educativo?" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(subnivel).toBeDisabled();

    await page.getByRole("button", { name: "Editar Nivel Educativo" }).click();
    await dialog.getByRole("button", { name: "Sí, editar" }).click();
    await expect(page.getByText("Modo edición activo")).toBeVisible();
    await subnivel.fill("Básica Superior");
    await page.getByRole("button", { name: "Solo guardar" }).click();
    await expect.poll(async () => (await savedMetadata(planId))?.nivelSubnivelOverride).toBe("Básica Superior");
  });
});
