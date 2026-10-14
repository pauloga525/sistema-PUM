# Despliegue — PUM Web

**Última actualización:** 2026-10-14

La app es un servidor Node.js (`next start`) más PostgreSQL. El acceso público
llega por Cloudflare Tunnel (por eso la IP del cliente se toma de
`cf-connecting-ip`).

## Requisitos del servidor

- Node.js 24 y npm
- PostgreSQL 15+ accesible desde el servidor de la app
- Un gestor de procesos que reinicie la app si se cae (systemd en Linux; NSSM o
  PM2 en Windows)

## Variables de entorno

Ver `.env.example`. En producción, como mínimo:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` (lo fija `npm start`) |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `AUTH_SECRET` | 32+ caracteres aleatorios; la app no arranca sin él |
| `AUTH_URL` | URL pública exacta (ej. `https://pum.colegio.edu.ec`) |
| `INSTITUTION_NAME` | Nombre en documentos y encabezados |

Nunca definir `ENABLE_DEV_USERS` en producción (de todos modos se ignora).

## Primer despliegue

```bash
git clone <repo> pum-web && cd pum-web
npm ci
cp .env.example .env            # completar
npm run db:deploy               # crea el esquema
npm run build
npm start                       # escucha en el puerto 3000 (PORT para cambiarlo)
```

Crear el primer SuperAdmin directamente en la base o con un script local
(no versionado), y desde su panel crear el resto de cuentas.

## Actualizar una versión

```bash
pg_dump "$DATABASE_URL" > respaldo-$(date +%F).sql   # 1. respaldo
git pull
npm ci
npm run db:deploy                                    # 2. migraciones pendientes
npm run build
# 3. reiniciar el proceso (systemctl restart pum-web, pm2 restart pum-web, …)
```

Si la base se creó con `prisma db push` (antes de las migraciones), seguir una
sola vez el procedimiento de `docs/database.md` → *Adoptar migraciones en una
base existente*.

## Ejemplo: servicio systemd

```ini
# /etc/systemd/system/pum-web.service
[Unit]
Description=PUM Web
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/pum-web
EnvironmentFile=/opt/pum-web/.env
ExecStart=/usr/bin/npm start
Restart=on-failure
User=pum

[Install]
WantedBy=multi-user.target
```

## Verificación

- `GET /api/health` responde `200 {"status":"ok"}` si la app llega a la base
  (503 si no).
- Tras actualizar, las sesiones abiertas siguen válidas salvo que cambie
  `AUTH_SECRET`.

## Tareas programadas

No hace falta cron: al arrancar, `src/instrumentation.ts` programa la limpieza
diaria de `rate_limits`, auditoría de usuarios (730 días) y log de errores (180
días). El historial de los PUM no se purga.
