import { describe, expect, it } from "vitest";
import { visibleTeacherLinks, type ActiveLinkChecker } from "./teacher-links";

const plan = { subjectId: "s", levelId: "l", academicYearId: "y" };
const links = [{ teacherId: "activo" }, { teacherId: "removido" }];
const isActive: ActiveLinkChecker = (_p, teacherId) => teacherId === "activo";

describe("visibleTeacherLinks", () => {
  it("oculta los vínculos huérfanos en un PUM en curso", () => {
    expect(visibleTeacherLinks({ ...plan, status: "FINALIZED" }, links, isActive)).toEqual([{ teacherId: "activo" }]);
  });

  it("un PUM firmado muestra a todos los que participaron", () => {
    expect(visibleTeacherLinks({ ...plan, status: "SIGNED" }, links, isActive)).toEqual(links);
  });
});
