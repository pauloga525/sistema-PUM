/**
 * Script de limpieza de archivos temporales — PUM Web
 *
 * Elimina archivos de exportación temporal (ZIP) que superaron su TTL.
 * Se puede ejecutar manualmente o configurar como cron job en el servidor:
 *   0 * * * * npx tsx scripts/clean-temp.ts   (cada hora)
 *
 * Ejecución:
 *   npx tsx scripts/clean-temp.ts
 */

import fs from "fs";
import path from "path";

const TEMP_DIR = process.env.EXPORT_TEMP_DIR ?? "/tmp/pum-exports";
const TTL_HOURS = Number(process.env.EXPORT_TEMP_TTL_HOURS ?? "24");
const TTL_MS = TTL_HOURS * 60 * 60 * 1000;

async function cleanTemp() {
  console.log(`🧹 Limpiando archivos temporales en ${TEMP_DIR} (TTL: ${TTL_HOURS}h)...`);

  if (!fs.existsSync(TEMP_DIR)) {
    console.log("  Directorio no existe, nada que limpiar.");
    return;
  }

  const files = fs.readdirSync(TEMP_DIR);
  const now = Date.now();
  let deleted = 0;
  let kept = 0;

  for (const file of files) {
    const filePath = path.join(TEMP_DIR, file);
    const stat = fs.statSync(filePath);
    const ageMs = now - stat.mtimeMs;

    if (ageMs > TTL_MS) {
      fs.unlinkSync(filePath);
      console.log(`  ✗ Eliminado: ${file} (edad: ${Math.round(ageMs / 3600000)}h)`);
      deleted++;
    } else {
      kept++;
    }
  }

  console.log(`\n✅ Limpieza completada: ${deleted} eliminados, ${kept} conservados.`);
}

cleanTemp().catch((e) => {
  console.error("❌ Error en limpieza:", e);
  process.exit(1);
});
