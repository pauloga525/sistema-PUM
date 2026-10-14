# CODES — PUM Web
# Comandos para poner en marcha el proyecto

**Última actualización:** 2026-06-16 (Fase 3 completa)
**Ruta del proyecto:** `c:\Users\Usuario\Desktop\PROYECTOS_2026\SISTEMA INSTITUCIONAL MODULOS\MODULO DE SILABOS\pum-web\`

> Todos los comandos se ejecutan desde la raíz `pum-web/` salvo indicación contraria.
> Terminal: **PowerShell** en Windows.

---

## 0. PREREQUISITOS

### Versiones instaladas en este proyecto
```powershell
node --version    # v24.x
npm --version     # v10+
psql --version    # PostgreSQL 18 (en C:\Program Files\PostgreSQL\18\bin\)
```

### PostgreSQL en el PATH (solo si no está automático)
```powershell
$env:PATH += ";C:\Program Files\PostgreSQL\18\bin"
```

---

## 1. LEVANTAR EL PROYECTO (ya instalado, BD con datos)

```powershell
cd "c:\Users\Usuario\Desktop\PROYECTOS_2026\SISTEMA INSTITUCIONAL MODULOS\MODULO DE SILABOS\pum-web"
npm run dev
# → http://localhost:3000
```

**Credenciales de prueba:**
- Docente: `docente@test.com` / `docente123`
- Admin:   `admin@test.com` / `admin123`

---

## 2. PRIMERA VEZ — Instalación completa

```powershell
# Paso 1: Instalar dependencias
npm install

# Paso 2: Crear la base de datos (requiere PostgreSQL en PATH)
$env:PATH += ";C:\Program Files\PostgreSQL\18\bin"
createdb -U postgres pum_web

# Paso 3: Crear .env (para Prisma CLI)
# Crear archivo .env en la raíz con:
# DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/pum_web"

# Paso 4: Crear .env.local (para Next.js)
# Crear archivo .env.local con:
# DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/pum_web"
# AUTH_SECRET="cadena-aleatoria-larga-minimo-32-chars"
# NEXTAUTH_URL="http://localhost:3000"
# INSTITUTION_NAME="Unidad Educativa Técnico Salesiano"
# ALLOWED_EMAIL_DOMAIN=""

# Paso 5: Generar cliente Prisma
npm run prisma:generate

# Paso 6: Crear tablas en la BD
npm run db:push

# Paso 7: Cargar datos iniciales
npm run db:seed

# Paso 8: Iniciar servidor
npm run dev
```

---

## 3. COMANDOS DE USO FRECUENTE

```powershell
npm run dev           # Servidor de desarrollo → http://localhost:3000
npm run build         # Build de producción
npm start             # Servidor de producción (requiere build previo)
npm run lint          # Linting ESLint
npx tsc --noEmit      # Verificar tipos TypeScript sin compilar
```

---

## 4. BASE DE DATOS — Comandos Prisma

```powershell
# Seed (carga usuarios dev, niveles, materias, asignaciones)
npm run db:seed

# Sincronizar schema con BD (sin migración — solo desarrollo)
npm run db:push

# Crear migración (cuando se modifica schema.prisma)
npm run db:migrate

# Regenerar cliente Prisma (después de cambiar schema.prisma)
npm run prisma:generate

# Ver datos en interfaz visual
npm run db:studio     # → http://localhost:5555

# Verificar conectividad
npm run db:check

# Resetear BD completa (¡BORRA TODOS LOS DATOS!)
npx prisma migrate reset
```

### Lo que carga el seed (scripts/seed.ts)
- Usuarios dev: `teacher-dev-1` (docente@test.com) y `admin-dev-1` (admin@test.com)
- 13 niveles: 1ro–10mo Básica + 1ro–3ro Bachillerato
- Año lectivo 2026-2027 + 2 quimestres
- 6 materias: MAT, LEN, CN, HCS, ING, EFI
- 4 asignaciones para teacher-dev-1: MAT/8EB, MAT/9EB, LEN/8EB, CN/1BGU

---

## 5. ARQUITECTURA — Archivos importantes por capa

### Auth (`src/auth.ts`)
- Actualmente: **CredentialsProvider** con usuarios hardcodeados (desarrollo)
- Estrategia JWT · `maxAge: 8h`
- Usuarios hardcodeados: `docente@test.com/docente123` y `admin@test.com/admin123`
- Pendiente: reemplazar con Google OAuth

### Proxy / Middleware (`src/proxy.ts`)
- Protege `/teacher/*` y `/admin/*`
- Corre en **Edge Runtime** — NO puede importar Prisma
- OJO: el archivo se llama `proxy.ts` (Next.js 16), NO `middleware.ts`

### Prisma 7 (`src/lib/prisma/client.ts`)
```typescript
// Siempre requiere PrismaPg adapter:
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
```

### Design tokens (`src/app/globals.css`)
```css
/* Tokens definidos en :root, registrados en @theme inline */
:root { --pum-color-primary: #1E40AF; }
@theme inline { --color-pum-primary: var(--pum-color-primary); }
/* → clases: bg-pum-primary, text-pum-primary, border-pum-primary */
```

---

## 6. FLUJO DE EXPORTACIÓN

```
Usuario clic "Descargar Word"
  → ExportMenu.tsx hace fetch GET /api/export/[planId]?format=docx
  → route.ts valida sesión → llama ExportService.build()
  → ExportService carga plan + contexto (subject, level, year, period, teacher)
  → DocxBuilder.build(plan, ctx) genera Buffer en memoria
  → Response con Content-Disposition: attachment; filename="PUM_MAT_8EB_2026-2027_1.docx"
  → Browser descarga el archivo

Usuario clic "Imprimir / PDF"
  → ExportMenu.tsx llama window.print()
  → El browser abre diálogo de impresión (usuario elige "Guardar como PDF")
  → Los elementos con clase .no-print quedan ocultos (@media print)
```

---

## 7. SHADCN/UI — Agregar componentes

```powershell
npx shadcn@latest add input
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add select
npx shadcn@latest add dropdown-menu
npx shadcn@latest add toast
npx shadcn@latest add card
```

---

## 8. SOLUCIÓN DE PROBLEMAS

### Puerto 3000 en uso
```powershell
netstat -ano | findstr :3000
taskkill /PID <número> /F
```

### Limpiar caché de Next.js
```powershell
Remove-Item .next -Recurse -Force
npm run dev
```

### Error "Cannot connect to database"
```powershell
Get-Service postgresql*
Start-Service postgresql-x64-18
npm run db:check
```

### Error "Prisma client not generated"
```powershell
npm run prisma:generate
```

### Error relacionado con package.json en C:\Users\Usuario\
```powershell
# Si existe este archivo, borrarlo — causa que Turbopack falle
Remove-Item C:\Users\Usuario\package.json
Remove-Item C:\Users\Usuario\package-lock.json
# Luego limpiar caché
Remove-Item .next -Recurse -Force
npm run dev
```

### Middleware y proxy activos al mismo tiempo
```powershell
# Solo puede existir UNO de estos dos:
Get-Item src\middleware.ts  # si existe, borrarlo
Get-Item src\proxy.ts       # este es el correcto en Next.js 16
Remove-Item src\middleware.ts
```

### Server Action "failed to find" (después de reiniciar)
- Hacer Ctrl+Shift+R (hard refresh) en el navegador para limpiar el ID de acción en caché

---

## 9. VARIABLES DE ENTORNO

### `.env` (solo para Prisma CLI — NO lo lee Next.js)
```
DATABASE_URL="postgresql://postgres:567980@localhost:5432/pum_web"
```

### `.env.local` (para Next.js runtime)
```
DATABASE_URL="postgresql://postgres:567980@localhost:5432/pum_web"
AUTH_SECRET="cadena-aleatoria-larga-minimo-32-chars"
NEXTAUTH_URL="http://localhost:3000"
INSTITUTION_NAME="Unidad Educativa Técnico Salesiano"
ALLOWED_EMAIL_DOMAIN=""
LOG_LEVEL="info"
```

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | ✅ | Cadena de conexión PostgreSQL |
| `AUTH_SECRET` | ✅ | Secret para JWT (mín. 32 chars) |
| `NEXTAUTH_URL` | ✅ | URL base de la app |
| `INSTITUTION_NAME` | ⚠️ | Unidad Educativa Técnico Salesiano en UI y documentos exportados |
| `ALLOWED_EMAIL_DOMAIN` | ⚠️ | Dominio para OAuth (vacío = sin restricción) |
| `LOG_LEVEL` | ❌ | debug / info / warn / error |
| `GOOGLE_CLIENT_ID` | ❌ | Para Fase 5 (OAuth) |
| `GOOGLE_CLIENT_SECRET` | ❌ | Para Fase 5 (OAuth) |
| `FTP_HOST` | ❌ | Para Fase 4 (NAS) |
| `FTP_USER` | ❌ | Para Fase 4 (NAS) |
| `FTP_PASSWORD` | ❌ | Para Fase 4 (NAS) |
