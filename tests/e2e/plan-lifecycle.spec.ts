import { expect, test, type Browser, type Page } from "@playwright/test";
import { loginAs } from "./support/auth";
import { CATALOG, COMPLETE_METADATA, USERS, type RoleKey } from "./support/data";
import { getContext, planState, prisma, seedPlan } from "./support/db";

/**
 * Ciclo de vida del PUM: docente → coordinador → admin.
 * Cada prueba usa su propio periodo (un PUM por año+periodo+materia+nivel),
 * así son independientes entre sí. Los botones clave se accionan por la UI;
 * las precondiciones largas (datos de la unidad, PUM ya finalizado) por Prisma.
 */

/** Abre una sesión aislada (contexto nuevo) para el rol indicado. */
async function openSession(browser: Browser, role: RoleKey): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(page, role);
  return page;
}

/** Fila de la bandeja del coordinador que corresponde al PUM. */
function coordinatorRow(page: Page, planId: string) {
  return page.locator("tr").filter({ has: page.locator(`a[href="/coordinator/${planId}/review"]`) });
}

/** Acciones (Firmar / Rechazar) del PUM en el dashboard del admin. */
async function adminPlanActions(page: Page, planId: string) {
  // Los PUM pendientes se agrupan por coordinador: hay que desplegar su fila
  await page.getByRole("button", { name: new RegExp(USERS.coordinator.name) }).click();
  const preview = page.locator(`a[href="/admin/pum/${planId}/preview"]`);
  await expect(preview).toBeVisible();
  return preview.locator("xpath=..");
}

test.describe("Ciclo de vida del PUM", () => {
  test("el docente crea su PUM, llena una fila y lo finaliza; el coordinador lo ve", async ({ page, browser }) => {
    const ctx = await getContext();
    const period = ctx.periods[0];

    await loginAs(page, "teacher");
    await page.getByRole("link", { name: new RegExp(CATALOG.yearLabel) }).click();
    await expect(page.getByRole("heading", { name: CATALOG.yearLabel })).toBeVisible();

    // Fila del periodo dentro de la tarjeta de la materia
    const periodRow = page
      .locator("div")
      .filter({ has: page.getByText(period.name, { exact: true }) })
      .filter({ has: page.getByRole("button", { name: "Crear PUM" }) })
      .last();
    await periodRow.getByRole("button", { name: "Crear PUM" }).click();

    await expect(page).toHaveURL(/\/planification\/[0-9a-f-]{36}$/);
    const planId = page.url().split("/").pop()!;
    expect(await planState(planId)).toMatchObject({ plan: "DRAFT" });

    // Precondición por DB: datos de la unidad completos (paso 1, no bajo prueba)
    await prisma.planification.update({ where: { id: planId }, data: { metadata: COMPLETE_METADATA } });

    await page.goto(`/teacher/${ctx.year.id}/${period.id}/planification/${planId}/table`);
    await expect(page.getByRole("columnheader", { name: /¿Qué van a aprender\?/ })).toBeVisible();

    await page.getByPlaceholder("Destreza con Criterio de Desempeño...").fill("Reconocer números enteros");
    await page.getByPlaceholder("Indicador de logro...").fill("Identifica números enteros en la recta");
    await page.getByPlaceholder("Material o recurso...").fill("Recta numérica impresa");
    await page.getByPlaceholder("Técnica o instrumento...").fill("Lista de cotejo");

    await page.getByRole("button", { name: "Finalizar PUM" }).click();
    await expect(page.getByRole("heading", { name: "Finalizar planificación" })).toBeVisible();
    await page.getByRole("button", { name: "Sí, finalizar" }).click();

    await expect(page.getByText(/Esta planificación fue finalizada el/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalizar PUM" })).toHaveCount(0);

    expect(await planState(planId)).toMatchObject({ plan: "FINALIZED" });
    const rows = await prisma.planificationRow.findMany({ where: { planificationId: planId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].data).toMatchObject({
      dcdItems:    [{ text: "Reconocer números enteros" }],
      indicators:  ["Identifica números enteros en la recta"],
      resources:   [{ text: "Recta numérica impresa" }],
      evaluations: ["Lista de cotejo"],
    });

    // El coordinador lo tiene en su bandeja, pendiente de revisión
    const coord = await openSession(browser, "coordinator");
    const row = coordinatorRow(coord, planId);
    await expect(row).toBeVisible();
    await expect(row).toContainText(USERS.teacher.name);
    await expect(row).toContainText("En revisión");
    await expect(row.getByRole("link", { name: "Revisar PUM" })).toBeVisible();
    await coord.context().close();
  });

  test("el coordinador envía retroalimentación y el docente la recibe", async ({ page, browser }) => {
    const ctx = await getContext();
    const period = ctx.periods[1];
    const planId = await seedPlan(period.number, "FINALIZED");
    const comment = "Revisa el nivel educativo indicado.";

    await loginAs(page, "coordinator");
    await coordinatorRow(page, planId).getByRole("link", { name: "Revisar PUM" }).click();
    await expect(page).toHaveURL(new RegExp(`/coordinator/${planId}/review$`));

    // Comentario en la primera sección revisable (Nivel Educativo)
    await page.getByTitle("Agregar comentario").first().click();
    await page.getByPlaceholder("Escribe tu retroalimentación...").fill(comment);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect.poll(async () => (await planState(planId)).states.meta_nivel?.comment).toBe(comment);

    await page.getByRole("button", { name: "Enviar retroalimentación" }).click();
    await page.getByRole("button", { name: "Confirmar envío" }).click();
    await expect(page.getByText("↑ Retroalimentación enviada")).toBeVisible();

    await expect.poll(() => planState(planId)).toMatchObject({
      plan:   "FEEDBACK_RECEIVED",
      review: "FEEDBACK_SENT",
    });

    // El docente ve las observaciones y puede volver a editar
    const teacher = await openSession(browser, "teacher");
    await teacher.goto(`/teacher/${ctx.year.id}/${period.id}/planification/${planId}`);
    await expect(teacher.getByText("Tu coordinador dejó observaciones en este PUM")).toBeVisible();
    // El comentario de la sección se muestra como tooltip al pasar el mouse
    await teacher.getByText("Subnivel", { exact: true }).hover();
    await expect(teacher.getByText(comment)).toBeVisible();
    await teacher.context().close();
  });

  test("el coordinador aprueba y envía a firma; el admin firma", async ({ page, browser }) => {
    const ctx = await getContext();
    const planId = await seedPlan(ctx.periods[2].number, "FINALIZED");

    await loginAs(page, "coordinator");
    await page.goto(`/coordinator/${planId}/review`);
    await expect(page.getByText(/0 \/ \d+ secciones revisadas/)).toBeVisible();

    // Aprueba cada sección (fijas + filas). El título cambia al aprobar.
    const pending = page.getByTitle("Aprobar sección");
    const total = await pending.count();
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total; i++) {
      await pending.first().click();
      await expect(pending).toHaveCount(total - i - 1);
    }
    await expect(page.getByText(`${total} / ${total} secciones revisadas`)).toBeVisible();
    // Espera a que el servidor guarde todas antes de aprobar el PUM
    await expect
      .poll(async () => Object.values((await planState(planId)).states).filter((s) => s.approved).length)
      .toBe(total);

    await page.getByRole("button", { name: "Aprobar PUM completo" }).click();
    await page.getByRole("button", { name: "Confirmar aprobación" }).click();
    await expect(page).toHaveURL(/\/coordinator\/feedback$/);
    expect(await planState(planId)).toMatchObject({ plan: "APPROVED", review: "APPROVED" });

    const row = coordinatorRow(page, planId);
    await expect(row).toContainText("Aprobado");
    await row.getByRole("button", { name: "Enviar para firma" }).click();
    await page.getByRole("button", { name: "Sí, enviar" }).click();
    await expect(page.getByText("PUM enviado para firma correctamente")).toBeVisible();
    await expect(row).toContainText("Pendiente de firma");
    expect(await planState(planId)).toMatchObject({ plan: "PENDING_SIGNATURE" });

    // El admin firma desde su dashboard
    const admin = await openSession(browser, "admin");
    const actions = await adminPlanActions(admin, planId);
    await actions.getByRole("button", { name: "Firmar" }).click();
    await expect(admin.getByRole("heading", { name: "Firmar y aprobar PUM" })).toBeVisible();
    await admin.getByRole("button", { name: "Sí, firmar y aprobar" }).click();
    await expect(admin.getByText("PUM firmado y aprobado correctamente")).toBeVisible();
    await expect(actions.getByRole("button", { name: "Firmar" })).toHaveCount(0);
    expect(await planState(planId)).toMatchObject({ plan: "SIGNED" });
    await admin.context().close();

    // El coordinador lo ve firmado
    await page.reload();
    await expect(row).toContainText("Firmado y aprobado");
  });

  test("el admin rechaza con un comentario y el coordinador lo ve rechazado", async ({ page, browser }) => {
    const ctx = await getContext();
    const planId = await seedPlan(ctx.periods[3].number, "PENDING_SIGNATURE");
    const reason = "Falta detallar los recursos de la unidad.";

    await loginAs(page, "admin");
    const actions = await adminPlanActions(page, planId);
    await actions.getByRole("button", { name: "Rechazar" }).click();
    await expect(page.getByRole("heading", { name: "Rechazar PUM" })).toBeVisible();
    await page.getByPlaceholder("Describe qué debe corregir el coordinador o docente...").fill(reason);
    await page.getByRole("button", { name: "Rechazar PUM" }).click();
    await expect(page.getByText("PUM rechazado. El coordinador fue notificado.")).toBeVisible();

    expect(await planState(planId)).toMatchObject({ plan: "ADMIN_REJECTED", rejection: reason });

    const coord = await openSession(browser, "coordinator");
    const row = coordinatorRow(coord, planId);
    await expect(row).toContainText("Rechazado por Admin");
    await expect(row).toContainText(reason);
    await expect(row.getByRole("button", { name: "Re-enviar para firma" })).toBeVisible();
    await coord.context().close();
  });
});
