import { describe, it, expect } from "vitest";
import { planRowsReducer, emptyRow, toSavePayload, type PlanRowsState } from "./usePlanRows";

function initial(): PlanRowsState {
  return { rows: [emptyRow(), emptyRow()], editedLocalIds: new Set() };
}

describe("planRowsReducer", () => {
  it("agrega, edita y quita ítems marcando la fila como editada", () => {
    const s0 = initial();
    const rowId = s0.rows[0].localId;

    const s1 = planRowsReducer(s0, { type: "ADD_ITEM", rowId, field: "indicators", localId: "x1" });
    expect(s1.rows[0].indicators.map((i) => i.localId)).toContain("x1");
    expect(s1.editedLocalIds.has(rowId)).toBe(true);
    expect(s1.rows[1]).toBe(s0.rows[1]);

    const s2 = planRowsReducer(s1, { type: "UPDATE_ITEM", rowId, field: "indicators", itemId: "x1", text: "hola" });
    expect(s2.rows[0].indicators.find((i) => i.localId === "x1")?.text).toBe("hola");

    const s3 = planRowsReducer(s2, { type: "REMOVE_ITEM", rowId, field: "indicators", itemId: "x1" });
    expect(s3.rows[0].indicators.some((i) => i.localId === "x1")).toBe(false);
  });

  it("agrega un principio sin duplicarlo y lo actualiza o quita", () => {
    const s0 = initial();
    const rowId = s0.rows[0].localId;
    const itemId = s0.rows[0].resources[0].localId;

    const add = { type: "ADD_PRINCIPLE", rowId, field: "resources", itemId, principio: 2 } as const;
    const s1 = planRowsReducer(planRowsReducer(s0, add), add);
    expect(s1.rows[0].resources[0].principles).toEqual([{ principio: 2, selections: [] }]);

    const updated = { principio: 2 as const, selections: [{ pauta: 4, subPautas: [1] }] };
    const s2 = planRowsReducer(s1, { type: "UPDATE_PRINCIPLE", rowId, field: "resources", itemId, principio: 2, updated });
    expect(s2.rows[0].resources[0].principles).toEqual([updated]);

    const s3 = planRowsReducer(s2, { type: "UPDATE_PRINCIPLE", rowId, field: "resources", itemId, principio: 2, updated: null });
    expect(s3.rows[0].resources[0].principles).toEqual([]);
  });

  it("inserta, quita filas (nunca la última) y no marca filas editadas", () => {
    const s0 = initial();
    const extra = emptyRow();
    const s1 = planRowsReducer(s0, { type: "INSERT_ROW", afterIndex: 0, row: extra });
    expect(s1.rows[1]).toBe(extra);
    expect(s1.editedLocalIds.size).toBe(0);

    const single: PlanRowsState = { rows: [extra], editedLocalIds: new Set() };
    expect(planRowsReducer(single, { type: "REMOVE_ROW", rowId: extra.localId })).toBe(single);
  });

  it("toSavePayload conserva el orden e incluye el id solo si existe", () => {
    const rows = [{ ...emptyRow(), id: "r1" }, emptyRow()];
    const payload = toSavePayload("plan", rows);
    expect(payload.rows.map((r) => r.rowIndex)).toEqual([0, 1]);
    expect(payload.rows[0]).toHaveProperty("id", "r1");
    expect(payload.rows[1]).not.toHaveProperty("id");
  });
});
