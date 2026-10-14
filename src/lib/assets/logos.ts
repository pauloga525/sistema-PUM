import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Logos institucionales opcionales en public/logos/. Se revisan una sola vez
 * por proceso: son archivos estáticos que no cambian en tiempo de ejecución.
 */
export interface Logos {
  /** public/logos/logo-left.png — encabezado de paneles y documentos. */
  left: boolean;
  /** public/logos/logo-right.png — encabezado de documentos y login. */
  right: boolean;
  /** public/logos/logo-header-right.png — barra superior de los paneles. */
  headerRight: boolean;
}

let cached: Logos | null = null;

export function getLogos(): Logos {
  if (!cached) {
    const dir = path.join(process.cwd(), "public", "logos");
    const exists = (file: string) => fs.existsSync(path.join(dir, file));
    cached = {
      left:        exists("logo-left.png"),
      right:       exists("logo-right.png"),
      headerRight: exists("logo-header-right.png"),
    };
  }
  return cached;
}
