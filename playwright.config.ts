import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_DATABASE_URL, E2E_PORT } from "./tests/e2e/support/env";

/**
 * Pruebas E2E del ciclo de vida del PUM (docente → coordinador → admin).
 * Todas comparten una base desechable (E2E_DATABASE_URL), por eso corren en
 * serie con un solo worker.
 */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: E2E_BASE_URL,
    locale: "es-EC",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${E2E_PORT}`,
    url: `${E2E_BASE_URL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Las variables del proceso tienen prioridad sobre .env (Next no las sobrescribe)
    env: {
      DATABASE_URL:     E2E_DATABASE_URL,
      AUTH_SECRET:      "e2e-secret-0123456789abcdef0123456789abcdef",
      AUTH_URL:         E2E_BASE_URL,
      PORT:             String(E2E_PORT),
      ENABLE_DEV_USERS: "false",
    },
  },
});
