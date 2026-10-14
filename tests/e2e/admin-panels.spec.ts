import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./support/auth";
import { prisma } from "./support/db";

/**
 * Diálogos de los paneles del admin (coordinadores y docentes): abrir/cerrar,
 * Esc, y los flujos de crear → resetear contraseña → eliminar. La base se
 * reinicia en global-setup, así los datos creados aquí no chocan entre corridas.
 */

/** Cédula de 10 dígitos distinta en cada prueba. */
function randomCedula(): string {
  return String(Math.floor(1_000_000_000 + Math.random() * 8_999_999_999));
}

function dialog(page: Page, name: string) {
  return page.getByRole("dialog", { name });
}

test.describe("Paneles del admin", () => {
  test("coordinadores: crear un coordinador nuevo y eliminarlo", async ({ page }) => {
    const name  = "Coordinador Panel E2E";
    const email = "coord.panel.e2e@uets.edu.ec";

    await loginAs(page, "admin");
    await page.goto("/admin/coordinators");
    await expect(page.getByRole("heading", { name: "Coordinadores de Área" })).toBeVisible();

    // Abrir y cerrar con Esc
    await page.getByRole("button", { name: "Nuevo coordinador" }).click();
    const create = dialog(page, "Nuevo coordinador de área");
    await expect(create).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(create).toBeHidden();

    // Crear un usuario nuevo
    await page.getByRole("button", { name: "Nuevo coordinador" }).click();
    await create.getByRole("button", { name: "Crear nuevo usuario" }).click();
    await create.getByLabel("Nombre completo").fill(name);
    await create.getByLabel("Número de cédula").fill(randomCedula());
    await create.getByLabel("Correo institucional").fill(email);
    await create.getByLabel("Área de coordinación").fill("Área E2E");
    await create.getByRole("button", { name: "Crear coordinador" }).click();

    // La contraseña temporal no se pierde con Esc: solo se cierra con "Listo"
    await expect(create.getByText("Coordinador creado correctamente.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(create).toBeVisible();
    await create.getByRole("button", { name: "Listo" }).click();
    await expect(create).toBeHidden();

    const card = page.locator("div.overflow-hidden").filter({ hasText: email });
    await expect(card).toBeVisible();

    // Eliminar: cancelar primero, luego confirmar
    await card.getByRole("button", { name: "Eliminar coordinador" }).click();
    const confirm = dialog(page, "Eliminar coordinador");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Cancelar" }).click();
    await expect(confirm).toBeHidden();

    await card.getByRole("button", { name: "Eliminar coordinador" }).click();
    await confirm.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(confirm).toBeHidden();
    await expect(page.getByText(email)).toHaveCount(0);
    await expect
      .poll(async () => (await prisma.user.findUnique({ where: { email } }))?.isActive)
      .toBe(false);
  });

  test("docentes: crear, resetear contraseña y eliminar", async ({ page }) => {
    const name  = "Docente Panel E2E";
    const email = "docente.panel.e2e@uets.edu.ec";

    await loginAs(page, "admin");
    await page.goto("/admin/teachers");

    // Crear
    await page.getByRole("button", { name: "Nuevo docente" }).click();
    const create = dialog(page, "Nuevo docente");
    await expect(create).toBeVisible();
    await create.getByLabel("Nombre completo").fill(name);
    await create.getByLabel("Número de cédula").fill(randomCedula());
    await create.getByLabel("Correo institucional").fill(email);
    await create.getByRole("button", { name: "Crear docente" }).click();
    await expect(create.getByText("Docente creado correctamente.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(create).toBeVisible();
    await create.getByRole("button", { name: "Listo" }).click();
    await expect(create).toBeHidden();

    await page.goto(`/admin/teachers?search=${encodeURIComponent(email)}`);
    const row = page.locator("tr").filter({ hasText: email });
    await expect(row).toBeVisible();

    // Resetear contraseña: Esc cierra antes de confirmar
    await row.getByRole("button", { name: "Contraseña" }).click();
    const reset = dialog(page, "Resetear contraseña");
    await expect(reset).toBeVisible();
    await expect(reset).toContainText(name);
    await page.keyboard.press("Escape");
    await expect(reset).toBeHidden();

    await row.getByRole("button", { name: "Contraseña" }).click();
    await reset.getByRole("button", { name: "Confirmar" }).click();
    await expect(reset.getByText("Contraseña restablecida.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(reset).toBeVisible();
    await reset.getByRole("button", { name: "Listo" }).click();
    await expect(reset).toBeHidden();

    // Eliminar
    await row.getByRole("button", { name: "Eliminar" }).click();
    const remove = dialog(page, "Eliminar docente");
    await expect(remove).toBeVisible();
    await remove.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(remove).toBeHidden();
    await expect
      .poll(async () => (await prisma.user.findUnique({ where: { email } }))?.isActive)
      .toBe(false);
  });
});
