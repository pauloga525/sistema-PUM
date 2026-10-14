import { expect, test } from "@playwright/test";
import { loginAs } from "./support/auth";
import { USERS } from "./support/data";

test.describe("Login por rol", () => {
  test("el docente llega a sus años lectivos", async ({ page }) => {
    await loginAs(page, "teacher");
    await expect(page.getByRole("heading", { name: "Planificaciones PUM" })).toBeVisible();
  });

  test("el coordinador llega a retroalimentación", async ({ page }) => {
    await loginAs(page, "coordinator");
    await expect(page.getByRole("heading", { name: "Retroalimentación" })).toBeVisible();
  });

  test("el admin llega al dashboard", async ({ page }) => {
    await loginAs(page, "admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("el docente no puede abrir el dashboard del admin", async ({ page }) => {
    await loginAs(page, "teacher");
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/teacher\/year$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
  });

  test("credenciales incorrectas muestran un error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(USERS.teacher.email);
    await page.getByLabel("Contraseña").fill("clave-incorrecta");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/login\?error=CredentialsSignin/);
    // Next también usa role="alert" para anunciar rutas: se filtra por texto
    await expect(page.getByRole("alert").filter({ hasText: "Credenciales incorrectas" })).toBeVisible();
  });

  test("sin sesión, una ruta protegida redirige al login", async ({ page }) => {
    await page.goto("/coordinator/feedback");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcoordinator%2Ffeedback/);
  });

  test("las rutas antiguas en español redirigen a las nuevas", async ({ request }) => {
    const legacy: Array<[string, string]> = [
      ["/coordinator/retroalimentacion", "/coordinator/feedback"],
      ["/coordinator/docentes", "/coordinator/teachers"],
      ["/mantenimiento", "/maintenance"],
      ["/teacher/y1/p1/planification/x1/tabla", "/teacher/y1/p1/planification/x1/table"],
    ];
    for (const [from, to] of legacy) {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status(), from).toBe(308);
      expect(res.headers()["location"], from).toBe(to);
    }
  });
});
