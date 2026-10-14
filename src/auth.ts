/**
 * Configuración principal de Auth.js v5 para PUM Web.
 *
 * Autenticación:
 *   1. DEV_USERS — credenciales hardcodeadas para desarrollo. Solo se activan con
 *      ENABLE_DEV_USERS=true y NODE_ENV distinto de "production".
 *   2. DB users  — docentes creados por admin, contraseña hasheada con bcrypt
 *
 * Sesión: JWT revalidado contra la BD cada SESSION_RECHECK_MS (usuario activo,
 * rol, cambio obligatorio y huella de la contraseña) y con duración absoluta
 * máxima de SESSION_ABSOLUTE_MAX_MS aunque la expiración sea deslizante.
 *
 * Usuarios de prueba disponibles (con ENABLE_DEV_USERS=true):
 *   docente@test.com      / docente123      → rol TEACHER
 *   admin@test.com        / admin123        → rol ADMIN
 *   coordinador@test.com  / coordinador123  → rol COORDINATOR
 *   superadmin@test.com   / superadmin123   → rol SUPERADMIN
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/logger/logger";
import { userAuditService } from "@/modules/audit/user-audit.service";
import { rateLimitService, RATE_LIMITS } from "@/modules/security/rate-limit.service";

const log = logger.child("Auth");

// Fallar al arrancar si falta el secreto de firma (se omite durante `next build`,
// donde las variables de producción pueden no estar presentes).
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  (process.env.AUTH_SECRET ?? "").length < 32
) {
  throw new Error("AUTH_SECRET no está definido o es demasiado corto (mínimo 32 caracteres).");
}

// Cuentas de prueba — solo con flag explícito y fuera de producción. Así, un
// `next dev` expuesto por el túnel no acepta estas credenciales por defecto.
const DEV_USERS_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_USERS === "true";

const DEV_USERS = DEV_USERS_ENABLED ? [
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
] : [];

// Hash bcrypt de relleno: se compara cuando el usuario no existe para que el
// tiempo de respuesta no revele qué correos están registrados.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("pum-dummy-password-not-used", 10);

/** Cada cuánto se relee el usuario en la BD para revalidar el JWT. */
const SESSION_RECHECK_MS = 60 * 1000;

/** Duración máxima de una sesión desde el login, aunque haya actividad. */
const SESSION_ABSOLUTE_MAX_MS = 12 * 60 * 60 * 1000;

type Role = "TEACHER" | "COORDINATOR" | "ADMIN" | "SUPERADMIN";

/**
 * Huella corta del hash de contraseña. Si la contraseña cambia (reseteo por un
 * admin o cambio por el usuario), la huella deja de coincidir y las sesiones
 * abiertas con la contraseña anterior se invalidan.
 */
function passwordFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

/** IP del cliente: Cloudflare Tunnel envía cf-connecting-ip. */
function clientIp(request: Request | undefined): string {
  const headers = request?.headers;
  return (
    headers?.get("cf-connecting-ip") ??
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

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
      async authorize(credentials, request) {
        const email    = (credentials?.email as string | undefined)?.trim();
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        // 1. Rate limit — por email+IP, por IP y por email global. La clave
        //    email+IP evita que un tercero bloquee la cuenta de un docente;
        //    las otras dos frenan ataques distribuidos o desde una sola IP.
        const ip       = clientIp(request);
        const emailKey = email.toLowerCase();
        const checks = await Promise.all([
          rateLimitService.check(`login:${emailKey}:${ip}`, RATE_LIMITS.LOGIN_EMAIL_IP.limit, RATE_LIMITS.LOGIN_EMAIL_IP.windowMs),
          rateLimitService.check(`login-ip:${ip}`,          RATE_LIMITS.LOGIN_IP.limit,       RATE_LIMITS.LOGIN_IP.windowMs),
          rateLimitService.check(`login-email:${emailKey}`, RATE_LIMITS.LOGIN_EMAIL.limit,    RATE_LIMITS.LOGIN_EMAIL.windowMs),
        ]);
        const blocked = checks.find(rl => !rl.allowed);
        if (blocked) {
          log.warn("Rate limit de login alcanzado", { email, ip, resetAt: blocked.resetAt });
          await userAuditService.log({
            eventType: "LOGIN_FAILED",
            result:    "FAILURE",
            actorEmail: email,
            metadata:  { reason: "rate_limited", ip, resetAt: blocked.resetAt.toISOString() },
          });
          return null;
        }

        // 2. Dev users — comparación en texto plano (solo con ENABLE_DEV_USERS=true)
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

        // 3. DB users — bcrypt comparison
        const dbUser = await prisma.user.findUnique({ where: { email } });

        if (!dbUser?.passwordHash) {
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          log.warn("Credenciales inválidas o usuario sin contraseña", { email });
          await userAuditService.log({ eventType: "LOGIN_FAILED", result: "FAILURE", actorEmail: email, metadata: { reason: "user_not_found" } });
          return null;
        }

        // bcrypt antes de revisar isActive: el tiempo de respuesta no distingue cuentas desactivadas
        const isValid = await bcrypt.compare(password, dbUser.passwordHash);
        if (!isValid) {
          log.warn("Contraseña incorrecta", { email });
          await userAuditService.log({ eventType: "LOGIN_FAILED", result: "FAILURE", actorId: dbUser.id, actorEmail: email, actorRole: dbUser.role, metadata: { reason: "wrong_password" } });
          return null;
        }

        if (!dbUser.isActive) {
          log.warn("Usuario desactivado intentó ingresar", { email });
          await userAuditService.log({ eventType: "LOGIN_FAILED", result: "FAILURE", actorId: dbUser.id, actorEmail: email, actorRole: dbUser.role, metadata: { reason: "user_inactive" } });
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
          role: dbUser.role as Role,
          forcePasswordChange: dbUser.forcePasswordChange,
          passwordFingerprint: passwordFingerprint(dbUser.passwordHash),
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
      const now = Date.now();

      if (user) {
        token.id                  = user.id;
        token.role                = user.role ?? "TEACHER";
        token.forcePasswordChange = user.forcePasswordChange ?? false;
        token.passwordFingerprint = user.passwordFingerprint;
        token.isDevUser           = DEV_USERS.some(u => u.id === user.id);
        token.loginAt             = now;
        token.checkedAt           = now;
        return token;
      }

      // Duración absoluta: la expiración de Auth.js se renueva con cada uso.
      // Tokens emitidos antes de este cambio no tienen loginAt → se invalidan.
      if (!token.loginAt || now - token.loginAt > SESSION_ABSOLUTE_MAX_MS) return null;

      if (token.isDevUser) return DEV_USERS_ENABLED ? token : null;

      if (token.checkedAt && now - token.checkedAt < SESSION_RECHECK_MS) return token;

      // Revalidación contra la BD. Si la consulta falla, el error se propaga y
      // Auth.js descarta la sesión (falla cerrado).
      const dbUser = await prisma.user.findUnique({
        where:  { id: token.id },
        select: { isActive: true, role: true, forcePasswordChange: true, passwordHash: true },
      });

      if (
        !dbUser?.isActive ||
        !dbUser.passwordHash ||
        passwordFingerprint(dbUser.passwordHash) !== token.passwordFingerprint
      ) {
        log.info("Sesión invalidada en revalidación", { userId: token.id });
        return null;
      }

      token.role                = dbUser.role as Role;
      token.forcePasswordChange = dbUser.forcePasswordChange;
      token.checkedAt           = now;
      return token;
    },

    session({ session, token }) {
      if (token) {
        session.user.id                  = token.id as string;
        session.user.role                = token.role ?? "TEACHER";
        session.user.forcePasswordChange = token.forcePasswordChange ?? false;
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
