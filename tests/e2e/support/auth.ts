import { expect, type Page } from "@playwright/test";
import { PASSWORD, USERS, type RoleKey } from "./data";

/** Página de inicio de cada rol tras el login. */
export const HOME: Record<RoleKey, RegExp> = {
  teacher:     /\/teacher\/year$/,
  coordinator: /\/coordinator\/feedback$/,
  admin:       /\/admin\/dashboard$/,
};

/**
 * Inicia sesión por la UI y espera la página de inicio del rol.
 * También descarta el modal de notificaciones ("Entendido"), que aparece
 * sobre cualquier página cuando hay PUM con novedades.
 */
export async function loginAs(page: Page, role: RoleKey): Promise<void> {
  await page.addLocatorHandler(
    page.getByRole("button", { name: "Entendido", exact: true }),
    async (button) => { await button.click(); },
  );

  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(USERS[role].email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(HOME[role]);
}
