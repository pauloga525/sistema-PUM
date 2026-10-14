import { describe, expect, it } from "vitest";
import { PlanStatus } from "@prisma/client";
import {
  PLAN_TRANSITIONS,
  EDITABLE_STATUSES,
  assertCanEdit,
  assertCanFinalize,
  canTransition,
  computeDisplayStatus,
  statusesLeadingTo,
} from "./planification.domain";
import type { Planification, PumRowData } from "./planification.types";
import { ErrorCode } from "@/lib/errors/error-codes";

const ALL = Object.values(PlanStatus);

function plan(overrides: Partial<Planification> = {}): Planification {
  return {
    id: "p1", academicYearId: "y", periodId: "pe", subjectId: "s", levelId: "l",
    status: "DRAFT", rows: [], metadata: null, editDeadlineAt: null, finalizedAt: null,
    createdAt: new Date(), updatedAt: new Date(), teachers: [], isEditor: true, editorName: null,
    ...overrides,
  };
}

const completeRow: PumRowData = {
  dcdItems: [{ text: "Destreza", ejes: [] }],
  indicators: ["Indicador"],
  methodologyItems: [],
  resources: [{ text: "Recurso", principles: [] }],
  evaluations: ["Evaluación"],
};

describe("PLAN_TRANSITIONS", () => {
  it("cubre todos los estados del enum", () => {
    expect(Object.keys(PLAN_TRANSITIONS).sort()).toEqual([...ALL].sort());
  });

  it("solo apunta a estados existentes y nunca a sí mismo", () => {
    for (const [from, targets] of Object.entries(PLAN_TRANSITIONS)) {
      for (const to of targets) {
        expect(ALL).toContain(to);
        expect(to).not.toBe(from);
      }
    }
  });

  it("SIGNED es terminal", () => {
    expect(PLAN_TRANSITIONS.SIGNED).toEqual([]);
  });

  it("todo estado salvo DRAFT es alcanzable", () => {
    for (const s of ALL.filter((x) => x !== "DRAFT")) {
      expect(statusesLeadingTo(s).length).toBeGreaterThan(0);
    }
  });

  it.each([
    ["DRAFT", "FINALIZED", true],
    ["FEEDBACK_RECEIVED", "FINALIZED", true],
    ["FINALIZED", "APPROVED", true],
    ["ADMIN_REJECTED", "FEEDBACK_RECEIVED", true],
    ["PENDING_SIGNATURE", "ADMIN_REJECTED", true],
    ["SIGNED", "ADMIN_REJECTED", false],      // un PUM firmado no puede rechazarse
    ["DRAFT", "APPROVED", false],             // no se aprueba sin revisión
    ["APPROVED", "SIGNED", false],            // la firma exige pasar por PENDING_SIGNATURE
  ] as const)("%s → %s = %s", (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
  });

  it("statusesLeadingTo es el inverso del mapa", () => {
    expect(statusesLeadingTo("FINALIZED").sort()).toEqual(["DRAFT", "FEEDBACK_RECEIVED"]);
    expect(statusesLeadingTo("PENDING_SIGNATURE").sort()).toEqual(["ADMIN_REJECTED", "APPROVED"]);
  });

  it("los estados editables pueden finalizarse", () => {
    for (const s of EDITABLE_STATUSES) expect(canTransition(s, "FINALIZED")).toBe(true);
  });
});

describe("computeDisplayStatus", () => {
  const now = new Date("2026-10-14T12:00:00Z");
  const past = new Date("2026-10-01T00:00:00Z");

  it("sin PUM → NOT_STARTED", () => {
    expect(computeDisplayStatus(null, now)).toBe("NOT_STARTED");
  });

  it("agrupa los estados posteriores a la aprobación", () => {
    for (const status of ["APPROVED", "PENDING_SIGNATURE", "SIGNED", "ADMIN_REJECTED"]) {
      expect(computeDisplayStatus({ status, editDeadlineAt: null }, now)).toBe("APPROVED");
    }
  });

  it("borrador fuera de plazo → OVERDUE", () => {
    expect(computeDisplayStatus({ status: "DRAFT", editDeadlineAt: past }, now)).toBe("OVERDUE");
  });

  it("el plazo no afecta a un PUM ya finalizado", () => {
    expect(computeDisplayStatus({ status: "FINALIZED", editDeadlineAt: past }, now)).toBe("FINALIZED");
  });
});

describe("assertCanEdit", () => {
  it("rechaza a quien no es editor", () => {
    expect(() => assertCanEdit(plan({ isEditor: false }))).toThrowError(
      expect.objectContaining({ code: ErrorCode.PLAN_NOT_OWNED_BY_TEACHER }),
    );
  });

  it.each(["FINALIZED", "APPROVED", "PENDING_SIGNATURE", "SIGNED", "ADMIN_REJECTED"] as const)(
    "rechaza el estado %s",
    (status) => {
      expect(() => assertCanEdit(plan({ status }))).toThrowError(
        expect.objectContaining({ code: ErrorCode.PLAN_ALREADY_FINALIZED }),
      );
    },
  );

  it("el plazo vencido bloquea el borrador pero no la corrección", () => {
    const past = new Date(Date.now() - 86_400_000);
    expect(() => assertCanEdit(plan({ status: "DRAFT", editDeadlineAt: past }))).toThrowError(
      expect.objectContaining({ code: ErrorCode.PLAN_DEADLINE_PASSED }),
    );
    expect(() => assertCanEdit(plan({ status: "FEEDBACK_RECEIVED", editDeadlineAt: past }))).not.toThrow();
  });
});

describe("assertCanFinalize", () => {
  it("exige al menos una fila completa", () => {
    expect(() => assertCanFinalize(plan())).toThrowError(
      expect.objectContaining({ code: ErrorCode.VAL_MISSING_FIELD }),
    );
    const row = { id: "r", rowIndex: 0, data: completeRow };
    expect(() => assertCanFinalize(plan({ rows: [row] }))).not.toThrow();
  });

  it("una fila sin recursos no cuenta como completa", () => {
    const row = { id: "r", rowIndex: 0, data: { ...completeRow, resources: [{ text: "", principles: [] }] } };
    expect(() => assertCanFinalize(plan({ rows: [row] }))).toThrow();
  });
});
