import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import { requireNotSelf } from "@/modules/auth/auth.guards";
import { userAuditService } from "@/modules/audit/user-audit.service";
import type { CreateUserInput, UpdateUserInput } from "./superadmin.schema";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  cedula: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  coordinatorArea: true,
  forcePasswordChange: true,
} as const;

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

class SuperAdminService {
  private async countActiveSuperAdmins(): Promise<number> {
    return prisma.user.count({ where: { role: "SUPERADMIN", isActive: true } });
  }

  async getUsers(filters: UserFilters = {}) {
    const { search, role, status, page = 1, perPage = 20 } = filters;
    const where: Prisma.UserWhereInput = {};

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
        { cedula: { contains: search.trim() } },
      ];
    }
    if (role && role !== "ALL") where.role = role;
    if (status === "active") where.isActive = true;
    else if (status === "inactive") where.isActive = false;

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Usuario no encontrado");
    return user;
  }

  async createUser(actorId: string, data: CreateUserInput) {
    const existingCedula = await prisma.user.findUnique({ where: { cedula: data.cedula }, select: { id: true } });
    if (existingCedula) throw new AppError(ErrorCode.VAL_INVALID_INPUT, "Ya existe un usuario con esa cédula");

    const existingEmail = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existingEmail) throw new AppError(ErrorCode.VAL_INVALID_INPUT, "Ya existe un usuario con ese email");

    const passwordHash = await bcrypt.hash(data.cedula, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        cedula: data.cedula,
        role: data.role,
        coordinatorArea: data.role === "COORDINATOR" ? (data.coordinatorArea ?? null) : null,
        passwordHash,
        forcePasswordChange: true,
        isActive: true,
      },
      select: USER_SELECT,
    });

    await userAuditService.log({
      eventType: "USER_CREATED",
      actorId,
      targetId: user.id,
      targetEmail: user.email,
      targetRole: user.role,
      metadata: { role: user.role } as Prisma.InputJsonValue,
    });

    return user;
  }

  async updateUser(actorId: string, userId: string, data: UpdateUserInput) {
    await this.getUserById(userId);

    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: { email: data.email, id: { not: userId } },
        select: { id: true },
      });
      if (existing) throw new AppError(ErrorCode.VAL_INVALID_INPUT, "Ya existe un usuario con ese email");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.coordinatorArea !== undefined && { coordinatorArea: data.coordinatorArea }),
      },
      select: USER_SELECT,
    });

    await userAuditService.log({
      eventType: "USER_UPDATED",
      actorId,
      targetId: userId,
      targetEmail: updated.email,
      targetRole: updated.role,
    });

    return updated;
  }

  async changeRole(actorId: string, userId: string, newRole: string) {
    requireNotSelf(actorId, userId);
    const user = await this.getUserById(userId);

    if (user.role === "SUPERADMIN" && newRole !== "SUPERADMIN") {
      const count = await this.countActiveSuperAdmins();
      if (count <= 1) {
        throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "No se puede cambiar el rol del único SuperAdmin activo");
      }
    }

    await prisma.user.update({ where: { id: userId }, data: { role: newRole } });
    await userAuditService.log({
      eventType: "USER_ROLE_CHANGED",
      actorId,
      targetId: userId,
      targetEmail: user.email,
      metadata: { from: user.role, to: newRole } as Prisma.InputJsonValue,
    });
  }

  async deactivateUser(actorId: string, userId: string) {
    requireNotSelf(actorId, userId);
    const user = await this.getUserById(userId);

    if (!user.isActive) throw new AppError(ErrorCode.VAL_INVALID_INPUT, "El usuario ya está desactivado");

    if (user.role === "SUPERADMIN") {
      const count = await this.countActiveSuperAdmins();
      if (count <= 1) {
        throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "No se puede desactivar al único SuperAdmin activo");
      }
    }

    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    await userAuditService.log({ eventType: "USER_DEACTIVATED", actorId, targetId: userId, targetEmail: user.email });
  }

  async reactivateUser(actorId: string, userId: string) {
    const user = await this.getUserById(userId);
    if (user.isActive) throw new AppError(ErrorCode.VAL_INVALID_INPUT, "El usuario ya está activo");

    await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    await userAuditService.log({ eventType: "USER_REACTIVATED", actorId, targetId: userId, targetEmail: user.email });
  }

  async resetPassword(actorId: string, userId: string) {
    const user = await this.getUserById(userId);
    if (!user.cedula) throw new AppError(ErrorCode.VAL_INVALID_INPUT, "El usuario no tiene cédula registrada");

    const passwordHash = await bcrypt.hash(user.cedula, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, forcePasswordChange: true },
    });

    await userAuditService.log({ eventType: "USER_PASSWORD_RESET", actorId, targetId: userId, targetEmail: user.email });
    return { tempPassword: user.cedula };
  }

  async getUserLoginHistory(userId: string, limit = 50) {
    return prisma.userAuditLog.findMany({
      where: {
        actorId: userId,
        eventType: { in: ["LOGIN_SUCCESS", "LOGIN_FAILED", "LOGOUT"] },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        eventType: true,
        result: true,
        actorIp: true,
        metadata: true,
      },
    });
  }

  async getStats() {
    const [total, active, inactive, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    ]);
    const roleMap = Object.fromEntries(byRole.map((r) => [r.role, r._count._all]));
    return { total, active, inactive, byRole: roleMap };
  }
}

export const superAdminService = new SuperAdminService();
