import { randomInt } from "node:crypto";

// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para dictar o copiar a mano sin errores
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Vigencia de una contraseña temporal (creación de cuenta o restablecimiento)
export const TEMP_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
export const TEMP_PASSWORD_TTL_DAYS = 7;

/**
 * Genera una contraseña temporal aleatoria de 12 caracteres con formato
 * `xxxx-xxxx-xxxx` usando el CSPRNG de Node (crypto.randomInt, sin sesgo).
 */
export function generateTempPassword(): string {
  const groups: string[] = [];
  for (let g = 0; g < 3; g++) {
    let group = "";
    for (let i = 0; i < 4; i++) group += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(group);
  }
  return groups.join("-");
}

/** Fecha de expiración de una contraseña temporal emitida ahora. */
export function tempPasswordExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + TEMP_PASSWORD_TTL_MS);
}
