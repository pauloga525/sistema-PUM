import { describe, expect, it } from "vitest";
import { buildPayload, emptyMetadata } from "./form-state";
import { validateMetadata } from "./validation";

const PLAN_ID = "11111111-1111-4111-8111-111111111111";

function completa() {
  return {
    ...emptyMetadata(),
    areaEstudio: "Matemática",
    numUnidad: "1",
    titulo: "Unidad",
    objetivos: ["Objetivo"],
    criterios: ["Criterio"],
    nPeriodos: "10",
    fechInicio: "01/09/2026",
    fechFin: "15/10/2026",
    ejesTransversales: "Eje",
  };
}

describe("validateMetadata", () => {
  it("un formulario vacío se puede guardar, pero no continuar", () => {
    const form = emptyMetadata();
    const soloGuardar = validateMetadata(buildPayload(PLAN_ID, form), form, false);
    expect(soloGuardar).toEqual({ errors: {}, blocksSave: false });

    const continuar = validateMetadata(buildPayload(PLAN_ID, form), form, true);
    expect(continuar.blocksSave).toBe(false);
    expect(continuar.errors).toMatchObject({
      areaEstudio: "Campo requerido",
      objetivos: "Ingresa al menos un objetivo",
      criterios: "Ingresa al menos un criterio",
      fechFin: "Campo requerido",
    });
  });

  it("los espacios en blanco no cuentan como dato obligatorio", () => {
    const form = { ...completa(), titulo: "   ", objetivos: ["  ", ""] };
    const { errors } = validateMetadata(buildPayload(PLAN_ID, form), form, true);
    expect(errors).toEqual({ titulo: "Campo requerido", objetivos: "Ingresa al menos un objetivo" });
  });

  it("un formulario completo no tiene errores", () => {
    const form = completa();
    expect(validateMetadata(buildPayload(PLAN_ID, form), form, true)).toEqual({ errors: {}, blocksSave: false });
  });

  it("aplica los límites del esquema del servidor con mensajes en español", () => {
    const form = { ...completa(), nPeriodos: "x".repeat(21), objetivos: ["a".repeat(5001)] };
    const result = validateMetadata(buildPayload(PLAN_ID, form), form, false);
    expect(result.blocksSave).toBe(true);
    expect(result.errors).toEqual({
      nPeriodos: "Máximo 20 caracteres",
      objetivos: "Máximo 5000 caracteres",
    });
  });

  it("los errores sin campo visible van al resumen del formulario", () => {
    const form = completa();
    const result = validateMetadata(buildPayload("no-es-uuid", form), form, false);
    expect(result.blocksSave).toBe(true);
    expect(result.errors.form).toContain("ID de planificación inválido");
  });
});
