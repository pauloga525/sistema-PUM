import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Prisma 7 no auto-carga .env al evaluar este archivo — lo hacemos manualmente.
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
