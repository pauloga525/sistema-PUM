/**
 * Configuración principal de Auth.js v5 para PUM Web.
 *
 * Autenticación:
 *   1. DEV_USERS — credenciales hardcodeadas para desarrollo (eliminar en prod)
 *   2. DB users  — docentes creados por admin, contraseña hasheada con bcrypt
 *
 * Usuarios de prueba disponibles:
 *   docente@test.com      / docente123      → rol TEACHER
 *   admin@test.com        / admin123        → rol ADMIN
 *   coordinador@test.com  / coordinador123  → rol COORDINATOR
 *   superadmin@test.com   / superadmin123   → rol SUPERADMIN
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/logger/logger";
import { userAuditService } from "@/modules/audit/user-audit.service";
import { rateLimitService, RATE_LIMITS } from "@/modules/security/rate-limit.service";

const log = logger.child("Auth");

const DEV_USERS = [
  {
    id: "teacher-dev-1",
    email: "docente@test.com",
    password: "docente123",
    name: "Docente de Prueba",
    role: "TEACHER" as const,
    forcePasswordChange: false,
  },
  {
    id: "admin-dev-1",
    email: "admin@test.com",
    password: "admin123",
    name: "Administrador",
    role: "ADMIN" as const,
    forcePasswordChange: false,
  },
  {
    id: "coordinator-dev-1",
    email: "coordinador@test.com",
    password: "coordinador123",
    name: "Coordinador de Prueba",
    role: "COORDINATOR" as const,
    forcePasswordChange: false,
  },
  {
    id: "superadmin-dev-1",
    email: "superadmin@test.com",
    password: "superadmin123",
    name: "Super Administrador",
    role: "SUPERADMIN" as const,
    forcePasswordChange: false,
  },
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Permite que Auth.js use X-Forwarded-Host / Host para construir URLs de redirect.
  // Necesario para que Cloudflare Tunnel redirija al dominio correcto (no a la IP interna).
  trustHost: true,

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email    = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        // 1. Dev users — plain text comparison (solo desarrollo)
        const devUser = DEV_USERS.find(u => u.email === email && u.password === password);
        if (devUser) {
          log.info("Login exitoso (dev)", { email: devUser.email, role: devUser.role });
          return {
            id: devUser.id,
            email: devUser.email,
            name: devUser.name,
            role: devUser.role,
            forcePasswordChange: devUser.forcePasswordChange,
          };
        }

        // 2. Rate limit — 10 intentos por email / 15 min (solo aplica a usuarios de BD)
        const rl = await rateLimitService.check(
          `login:${email}`,
          RATE_LIMITS.LOGIN.limit,
          RATE_LIMITS.LOGIN.windowMs,
        );
        if (!rl.allowed) {
          log.warn("Rate limit de login alcanzado", { email, resetAt: rl.resetAt });
          await userAuditService.log({
            eventType: "LOGIN_FAILED",
            result:    "FAILURE",
            actorEmail: email,
            metadata:  { reason: "rate_limited", resetAt: rl.resetAt.toISOString() },
          });
          return null;
        }

        // 3. DB users — bcrypt comparison
        const dbUser = await prisma.user.findUnique({ where: { email } });

        if (!dbUser?.passwordHash) {
          log.warn("Credenciales inválidas o usuario sin contraseña", { email });
          await userAuditService.log({ eventType: "LOGIN_FAILED", result: "FAILURE", actorEmail: email, metadata: { reason: "user_not_found" } });
          return null;
        }

        if (!dbUser.isActive) {
          log.warn("Usuario desactivado intentó ingresar", { email });
          await userAuditService.log({ eventType: "LOGIN_FAILED", result: "FAILURE", actorId: dbUser.id, actorEmail: email, actorRole: dbUser.role, metadata: { reason: "user_inactive" } });
          return null;
        }

        const isValid = await bcrypt.compare(password, dbUser.passwordHash);
        if (!isValid) {
          log.warn("Contraseña incorrecta", { email });
          await userAuditService.log({ eventType: "LOGIN_FAILED", result: "FAILURE", actorId: dbUser.id, actorEmail: email, actorRole: dbUser.role, metadata: { reason: "wrong_password" } });
          return null;
        }

        log.info("Login exitoso (db)", { email: dbUser.email, role: dbUser.role });
        await Promise.all([
          prisma.user.update({ where: { id: dbUser.id }, data: { lastLoginAt: new Date() } }),
          userAuditService.log({ eventType: "LOGIN_SUCCESS", actorId: dbUser.id, actorEmail: dbUser.email, actorRole: dbUser.role }),
        ]);
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role as "TEACHER" | "COORDINATOR" | "ADMIN" | "SUPERADMIN",
          forcePasswordChange: dbUser.forcePasswordChange,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: Number(process.env.SESSION_MAX_AGE ?? String(8 * 60 * 60)),
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id                  = user.id;
        token.role                = (user as { role?: string }).role ?? "TEACHER";
        token.forcePasswordChange = (user as { forcePasswordChange?: boolean }).forcePasswordChange ?? false;
      }
      return token;
    },

    session({ session, token }) {
      if (token) {
        session.user.id                  = token.id as string;
        session.user.role                = (token.role as "TEACHER" | "COORDINATOR" | "ADMIN" | "SUPERADMIN") ?? "TEACHER";
        session.user.forcePasswordChange = (token.forcePasswordChange as boolean) ?? false;
      }
      return session;
    },
  },
});

/*
 * TODO — Para activar Google OAuth en producción:
 * 1. Reemplazar Credentials por Google provider
 * 2. Restaurar PrismaAdapter
 * 3. Restaurar callback signIn con verificación de dominio
 * 4. Configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local
 * 5. Restaurar login/page.tsx con el botón de Google
 */
