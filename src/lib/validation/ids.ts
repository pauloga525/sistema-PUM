import { z } from "zod";

/**
 * Id de registro recibido desde el cliente. La mayoría son UUID, pero los
 * datos sembrados usan ids legibles (ej. "teacher-dev-1"), así que se valida
 * formato y longitud en vez de exigir UUID.
 */
export const IdSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "Identificador inválido");
