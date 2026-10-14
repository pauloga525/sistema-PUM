import { describe, expect, it } from "vitest";
import { generateTempPassword, tempPasswordExpiresAt, TEMP_PASSWORD_TTL_MS } from "./temp-password";

describe("generateTempPassword", () => {
  it("tiene el formato xxxx-xxxx-xxxx sin caracteres ambiguos", () => {
    for (let i = 0; i < 200; i++) {
      const pwd = generateTempPassword();
      expect(pwd).toMatch(/^[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}$/);
      expect(pwd).not.toMatch(/[0O1lI]/);
    }
  });

  it("no se repite", () => {
    const set = new Set(Array.from({ length: 500 }, generateTempPassword));
    expect(set.size).toBe(500);
  });
});

describe("tempPasswordExpiresAt", () => {
  it("vence a los 7 días", () => {
    const from = new Date("2026-10-14T00:00:00Z");
    expect(tempPasswordExpiresAt(from).getTime() - from.getTime()).toBe(TEMP_PASSWORD_TTL_MS);
    expect(TEMP_PASSWORD_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
