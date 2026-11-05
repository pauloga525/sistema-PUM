# Despliegue — PUM Web

**Última actualización:** 2026-11-05

Producción:

- **App:** HostGator, hosting compartido con cPanel → *Application Manager*
  (Phusion Passenger), en `https://academico.uets.edu.ec`.
- **Base de datos:** PostgreSQL en Supabase (conexión *Session pooler*).
- **Despliegue:** automático con GitHub Actions al hacer push a `main`.

## Flujo

```
git push main ──► CI (tipos, lint, pruebas, build) ──verde──► Deploy (.github/workflows/deploy.yml)
                                                                1. next build en modo standalone
                                                                2. prisma migrate deploy (Supabase)
                                                                3. subida por FTP (solo lo que cambió)
                                                                4. tmp/restart.txt → Passenger reinicia
                                                                5. GET /api/health
```

La app se compila en GitHub, no en HostGator: el hosting compartido tiene poca
memoria para `next build`. El paquete `standalone` ya trae sus `node_modules`,
así que en cPanel **no** hace falta *Run NPM Install*.

---

## Configuración inicial (una sola vez)

### 1. Dominio

El PUM se publica en `academico.uets.edu.ec` (dominio ya existente en la cuenta,
carpeta `/home1/uets/academico.uets.edu.ec`). La web de Angular vive en
`/home1/uets/public_html` y no se toca. Antes de registrar la app, revisar que
`academico.uets.edu.ec/public_html` no tenga nada en uso: el Application Manager
toma el control de ese dominio.

### 2. Carpeta y cuenta FTP de la app

- cPanel → *File Manager*: crear en el directorio home (`/home1/uets`) una
  carpeta **vacía** `pum-app`, al mismo nivel que `academico.uets.edu.ec` y
  fuera de cualquier `public_html` (todo lo que está en `public_html` se puede
  descargar desde el navegador).
- cPanel → *FTP Accounts*: crear una cuenta (ej. `deploy-pum`) cuyo directorio
  sea **`pum-app`**. Así GitHub Actions solo puede escribir en esa carpeta.

### 3. Registrar la app (cPanel → Application Manager → Register Application)

| Campo | Valor |
|---|---|
| Application Name | `Sistema-PUM` |
| Deployment Domain | `academico.uets.edu.ec` |
| Base Application URL | `/` |
| Application Path | `pum-app` |
| Deployment Environment | Producción |

Variables de entorno:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://postgres.<id>:<clave>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require` |
| `DATABASE_POOL_MAX` | `5` (el plan gratuito de Supabase tiene pocas conexiones) |
| `AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `AUTH_URL` | `https://academico.uets.edu.ec` |
| `INSTITUTION_NAME` | Nombre oficial de la institución |

cPanel no acepta tildes, espacios ni `${` en los valores: usar contraseñas solo
con letras y números (o codificar `$`→`%24`, `@`→`%40`, `#`→`%23`). Nunca
definir `ENABLE_DEV_USERS`.

El archivo de arranque es `app.js` (lo genera el workflow a partir de
`deploy/hostgator/app.js`). Activar SSL para el dominio en cPanel → *SSL/TLS
Status* (AutoSSL).

### 4. Versión de Node

Next.js 16 necesita **Node 20.9 o mayor**. Confirmarla con `node -v` en la
*Terminal* de cPanel o con el soporte de HostGator, y poner la misma versión
mayor en la variable `NODE_VERSION` de GitHub (paso 5).

### 5. GitHub

Repo → *Settings → Environments → New environment* → `production`. Opcional:
*Deployment branches* = `main` y *Required reviewers* para aprobar cada
despliegue.

**Secrets** del entorno:

| Secret | Valor |
|---|---|
| `FTP_SERVER` | host FTP (cPanel → *FTP Accounts* → *Configure FTP Client*) |
| `FTP_USERNAME` | la cuenta del paso 2, ej. `deploy-pum@academico.uets.edu.ec` |
| `FTP_PASSWORD` | su contraseña |
| `DATABASE_URL` | la misma de cPanel (para aplicar migraciones) |

**Variables** del entorno:

| Variable | Valor |
|---|---|
| `APP_URL` | `https://academico.uets.edu.ec` (verificación de `/api/health`) |
| `NODE_VERSION` | versión mayor de Node del servidor, ej. `20` o `22` (por defecto `22`) |
| `FTP_PROTOCOL` | `ftps` (por defecto); `ftp` solo si el servidor no acepta TLS |
| `FTP_SERVER_DIR` | `./` (por defecto) si la cuenta FTP ya apunta a `pum-app` |

### 6. Primer despliegue

*Actions → Deploy → Run workflow* (rama `main`). La primera subida tarda más
porque sube todo `node_modules`; las siguientes solo suben lo que cambió.
Después, crear el primer SuperAdmin directamente en la base y desde su panel el
resto de cuentas.

---

## Operación

| Tarea | Cómo |
|---|---|
| Desplegar | `git push` a `main` (o *Run workflow*) |
| Ver errores de la app | cPanel → Application Manager, o `~/logs` / `pum-app/stderr.log` según el servidor |
| Reiniciar | Application Manager → *Restart*, o volver a correr el workflow |
| Volver a una versión anterior | *Actions → Deploy → Run workflow* no sirve para commits viejos: hacer `git revert` del cambio y push a `main` |
| Respaldo de la base | Supabase hace respaldos diarios (plan de pago) o `pg_dump` con la URL del session pooler |

- Las migraciones se aplican **antes** de subir el código nuevo; durante la
  subida la versión anterior puede convivir unos minutos con el esquema nuevo.
  Las migraciones deben ser compatibles hacia atrás (agregar antes que borrar).
- Passenger puede detener la app si nadie la usa un tiempo: la primera visita
  tarda unos segundos y las limpiezas diarias de `src/instrumentation.ts` pueden
  no correr todos los días.

## Compilar y probar en local

```bash
npm ci
npx prisma generate
npm run build
npm start          # http://localhost:3000, con el .env local
```

Para probar el mismo paquete que se sube a HostGator (PowerShell):

```powershell
$env:BUILD_STANDALONE = "1"; npm run build
Copy-Item -Recurse .next/static .next/standalone/.next/
Copy-Item deploy/hostgator/app.js .next/standalone/
cd .next/standalone; node --env-file=../../.env app.js
```

## Verificación

- `GET /api/health` responde `200 {"status":"ok"}` si la app llega a la base
  (503 si no).
- Tras actualizar, las sesiones abiertas siguen válidas salvo que cambie
  `AUTH_SECRET`.
