import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Dos proyectos:
 *   - unit:        lógica pura (dominio, helpers). Sin base de datos.
 *   - integration: servicios contra PostgreSQL real. Requiere TEST_DATABASE_URL
 *                  apuntando a una base desechable (se borra su contenido).
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/integration/setup.ts"],
          // Comparten una sola base: un archivo a la vez
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
