import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAs } from "./support/auth";
import { COMPLETE_METADATA } from "./support/data";
import { completeRow, getContext, prisma, seedPlan } from "./support/db";

/**
 * Smoke de las pantallas refactorizadas que no cubre el ciclo de vida:
 * vistas previas (docente, admin, superadmin) y los diálogos de la tabla PUM.
 * Usa periodos propios (fuera de los del ciclo de vida y del paso 1) para que
 * sus PUM no choquen con los de otras pruebas.
 */

const DRAFT_PERIOD   = { number: 10, name: "Periodo E2E Pantallas" };
const PENDING_PERIOD = { number: 11, name: "Periodo E2E Firma" };
const ERROR_TEXT     = "Ocurrió un error inesperado";

async function ensurePeriod(number: number, name: string) {
  const ctx = await getContext();
  const period = await prisma.period.upsert({
    where:  { academicYearId_number: { academicYearId: ctx.year.id, number } },
    update: {},
    create: { academicYearId: ctx.year.id, number, name },
  });
  await prisma.planification.deleteMany({ where: { periodId: period.id } });
  return { yearId: ctx.year.id, periodId: period.id };
}

/** PUM en borrador con datos de la unidad y dos filas completas. */
async function seedDraftWithRows() {
  const { yearId, periodId } = await ensurePeriod(DRAFT_PERIOD.number, DRAFT_PERIOD.name);
  const planId = await seedPlan(DRAFT_PERIOD.number, "DRAFT");
  await prisma.planificationRow.create({
    data: { planificationId: planId, rowIndex: 1, data: completeRow("Segunda fila") },
  });
  return { planId, base: `/teacher/${yearId}/${periodId}/planification/${planId}` };
}

/** Falla la prueba si la página lanza una excepción no capturada. */
function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function expectNoErrorBoundary(page: Page) {
  await expect(page.getByText(ERROR_TEXT)).toHaveCount(0);
}

/** Documento del PUM con los datos sembrados (cabecera, unidad y primera fila). */
async function expectPlanDocument(page: Page, rowText: string) {
  await expect(page.getByText("PLAN DE UNIDAD MICROCURRICULAR")).toBeVisible();
  await expect(page.getByText(COMPLETE_METADATA.titulo, { exact: true })).toBeVisible();
  await expect(page.getByText(rowText, { exact: true })).toBeVisible();
}

/** Fila <tr> de la tabla PUM identificada por su primera destreza. */
function tableRow(page: Page, n: number): Locator {
  return page.locator("tr").filter({ has: page.getByRole("textbox", { name: `Fila ${n} — destreza 1`, exact: true }) });
}

test.describe("Smoke de pantallas", () => {
  test("vista previa del docente muestra el documento", async ({ page }) => {
    const errors = trackPageErrors(page);
    const { base } = await seedDraftWithRows();

    await loginAs(page, "teacher");
    await page.goto(`${base}/preview`);
    await expectPlanDocument(page, `Fila ${DRAFT_PERIOD.name} — destreza`);
    await expect(page.getByText("Segunda fila — destreza", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "← Volver al editor" })).toBeVisible();
    await expectNoErrorBoundary(page);
    expect(errors).toEqual([]);
  });

  test("vistas previas del admin: documento e historial de revisión", async ({ page }) => {
    const errors = trackPageErrors(page);
    await ensurePeriod(PENDING_PERIOD.number, PENDING_PERIOD.name);
    const planId = await seedPlan(PENDING_PERIOD.number, "PENDING_SIGNATURE");

    await loginAs(page, "admin");

    for (const url of [`/admin/pum/${planId}/preview`, `/plan-preview/${planId}`]) {
      await page.goto(url);
      await expectPlanDocument(page, `Fila ${PENDING_PERIOD.name} — destreza`);
      await expectNoErrorBoundary(page);

      // Historial: abre, carga y cierra con Esc; luego con el botón "Cerrar"
      const history = page.getByRole("dialog", { name: "Historial de Revisión" });
      await page.getByRole("button", { name: "Historial", exact: true }).click();
      await expect(history).toBeVisible();
      await expect(history.getByText("Cargando historial…")).toHaveCount(0);
      await expect(history.getByText("Sin eventos registrados aún.").or(history.locator("table"))).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(history).toBeHidden();

      await page.getByRole("button", { name: "Historial", exact: true }).click();
      await expect(history).toBeVisible();
      await history.getByRole("button", { name: "Cerrar", exact: true }).click();
      await expect(history).toBeHidden();
      await expectNoErrorBoundary(page);
    }

    // Solo la vista del admin (PUM pendiente) ofrece firmar / rechazar
    await page.goto(`/admin/pum/${planId}/preview`);
    await expect(page.getByRole("button", { name: "Firmar" }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("tabla del PUM: diálogos de ERE, Preparatória, DUA y eliminar fila", async ({ page }) => {
    const errors = trackPageErrors(page);
    const { planId, base } = await seedDraftWithRows();

    await loginAs(page, "teacher");
    await page.goto(`${base}/tabla`);
    await expect(page.getByRole("columnheader", { name: /¿Qué van a aprender\?/ })).toBeVisible();
    const row1 = tableRow(page, 1);
    await expect(row1).toBeVisible();
    await expect(tableRow(page, 2)).toBeVisible();

    // ── ERE: elegir un eje y cerrar con Esc ────────────────────────────────
    await row1.getByRole("button", { name: "+ ERE" }).click();
    const ere = page.getByRole("dialog", { name: /^Educación Religiosa Escolar/ });
    await expect(ere).toBeVisible();
    const ereOption = ere.getByRole("button", { name: "Poner a la persona en el centro" });
    await ereOption.click();
    await expect(ereOption).toHaveAttribute("aria-pressed", "true");
    await expect(ere).toHaveAccessibleName(/1 seleccionado/);
    await page.keyboard.press("Escape");
    await expect(ere).toBeHidden();
    await expect(row1.getByRole("button", { name: "Quitar Poner a la persona en el centro" })).toBeVisible();
    await expect(row1.getByRole("button", { name: "+ ERE (1)" })).toBeVisible();

    // ── Preparatória: elegir una habilidad y cerrar con "Listo" ────────────
    await row1.getByRole("button", { name: "+ Preparatória" }).click();
    const prep = page.getByRole("dialog", { name: /^Preparatória/ });
    await expect(prep).toBeVisible();
    await prep.getByRole("button", { name: "Habilidades Digitales" }).click();
    await prep.getByRole("button", { name: "✓ Listo" }).click();
    await expect(prep).toBeHidden();
    await expect(row1.getByRole("button", { name: "Quitar Habilidades Digitales" })).toBeVisible();
    // Reabrir y cerrar con la ×
    await row1.getByRole("button", { name: "+ Preparatória (1)" }).click();
    await expect(prep).toBeVisible();
    await prep.getByRole("button", { name: "Cerrar" }).click();
    await expect(prep).toBeHidden();

    // ── DUA: +P1/+P2/+P3 abren el diálogo; luego editar desde el badge ─────
    // Celda "Recursos" de la fila 1 (su único recurso no tiene principios)
    const resources1 = row1.getByRole("cell").filter({ has: page.getByRole("textbox", { name: "Fila 1 — recurso 1", exact: true }) });
    const principleDialog = (n: number) => page.getByRole("dialog", { name: new RegExp(`^P${n}\\s*Principio DUA`) });
    for (const n of [1, 2, 3]) {
      await resources1.getByRole("button", { name: `Agregar Principio ${n}` }).click();
      const dlg = principleDialog(n);
      await expect(dlg).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dlg).toBeHidden();
      await expect(resources1.getByRole("button", { name: `Agregar Principio ${n}` })).toHaveCount(0);
      await expect(resources1.getByTitle(`P${n} — click para editar`)).toBeVisible();
    }

    // Abrir el badge P1, elegir pauta 1 + sub-pauta 1 y confirmar con "Listo"
    await resources1.getByTitle("P1 — click para editar").click();
    const p1 = principleDialog(1);
    await expect(p1).toBeVisible();
    await p1.getByRole("button", { name: /^1\. / }).click();               // pauta 1
    await expect(p1.getByText("Sub-pautas — Pauta 1")).toBeVisible();
    await p1.getByRole("button", { name: /^1:1\.1/ }).click();               // sub-pauta 1.1
    await p1.getByRole("button", { name: "✓ Listo" }).click();
    await expect(p1).toBeHidden();
    await expect(resources1.getByTitle("P1:11 — click para editar")).toBeVisible();

    // El badge se reabre y se cierra con la ×
    await resources1.getByTitle("P1:11 — click para editar").click();
    await expect(p1).toBeVisible();
    await p1.getByRole("button", { name: "Cerrar" }).click();
    await expect(p1).toBeHidden();

    // ── Eliminar fila: Esc y Cancelar no borran; confirmar sí ──────────────
    const deleteRow2 = page.getByRole("button", { name: "Eliminar fila 2", exact: true });
    const confirm = page.getByRole("dialog", { name: "¿Eliminar esta fila?" });
    await deleteRow2.click();
    await expect(confirm).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(confirm).toBeHidden();

    await deleteRow2.click();
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Cancelar" }).click();
    await expect(confirm).toBeHidden();
    await expect(tableRow(page, 2)).toBeVisible();

    await deleteRow2.click();
    await confirm.getByRole("button", { name: "Eliminar fila", exact: true }).click();
    await expect(confirm).toBeHidden();
    await expect(tableRow(page, 2)).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Fila 1 — destreza 1", exact: true }))
      .toHaveValue(`Fila ${DRAFT_PERIOD.name} — destreza`);
    // Con una sola fila ya no se puede eliminar
    await expect(page.getByRole("button", { name: "Eliminar fila 1", exact: true })).toBeDisabled();

    // La página sigue funcional: guardar persiste la fila borrada y los ejes/DUA
    await page.getByRole("button", { name: "Guardar", exact: true }).first().click();
    await expect.poll(() => prisma.planificationRow.count({ where: { planificationId: planId } })).toBe(1);
    const [saved] = await prisma.planificationRow.findMany({ where: { planificationId: planId } });
    expect(saved.data).toMatchObject({
      dcdItems:  [{ text: `Fila ${DRAFT_PERIOD.name} — destreza`, ejes: expect.arrayContaining([11, 36]) }],
      resources: [{
        text:       `Fila ${DRAFT_PERIOD.name} — recurso`,
        principles: expect.arrayContaining([
          { principio: 1, selections: [{ pauta: 1, subPautas: [1] }] },
          { principio: 2, selections: [] },
          { principio: 3, selections: [] },
        ]),
      }],
    });

    await expectNoErrorBoundary(page);
    expect(errors).toEqual([]);
  });
});
