# Deploy Oracle — TaskView (`affine-uribe.duckdns.org`)

VM: `ubuntu@159.54.149.50` · path remoto: `/opt/taskview` · proxy: Caddy

## Qué hay en producción

| Servicio | Puerto local | Público |
|----------|--------------|---------|
| Web (Vue) | `127.0.0.1:8888` | `https://affine-uribe.duckdns.org/` |
| API | `127.0.0.1:1725` | mismas rutas `/module/*`, `/scim/*`, `/.well-known/*` |
| Postgres | solo red Docker | volumen `pgdata` |

AFFiNE fue retirado. Backup puntual: `/opt/backups/affine-*.tar.gz` en la VM.

## Deploy desde tu Mac

```bash
# 1) Env de producción (una vez)
cp deploy/oracle/env.postgresql.example deploy/oracle/.env.postgresql
cp deploy/oracle/env.taskview.example deploy/oracle/.env.taskview
# edita secretos (JWT, DB, SMTP, ENCRYPTION_KEY)

# 2) Subir / reiniciar
bash deploy/oracle/deploy.sh
```

## Actualizar imágenes

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@159.54.149.50 'cd /opt/taskview && sudo docker compose pull && sudo docker compose up -d'
```

## Login inicial

Tras un deploy limpio: `user` / `user1!#Q` — cámbialo en Account settings al entrar.

## Notas

- `TASKVIEW_API_URL` apunta al mismo dominio; Caddy enruta la API por path.
- `ALLOW_PUBLIC_REGISTRATION=false` — solo invitados / cuentas existentes.
- No commitees `.env.postgresql` ni `.env.taskview`.
