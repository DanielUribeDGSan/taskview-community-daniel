# Guía para IAs — TaskView en Oracle

URL: https://affine-uribe.duckdns.org  
VM: `ubuntu@159.54.149.50` · SSH key típica: `~/.ssh/id_ed25519`  
Stack: `/opt/taskview` (Docker Compose) + Caddy en `/etc/caddy/Caddyfile`

## Arquitectura

| Capa | Dónde |
|------|--------|
| Web | contenedor `taskview-webapp` → `127.0.0.1:8888` |
| API | contenedor `taskview-api-server` → `127.0.0.1:1725` |
| DB | Postgres 17, volumen `pgdata` |
| TLS / routing | Caddy: `/module/*`, `/scim/*`, `/.well-known/*` → API; resto → web |

AFFiNE ya no corre. Backup: `/opt/backups/affine-*.tar.gz`.

## Cómo desplegar cambios

Desde el repo local `taskview-community-main`:

```bash
bash deploy/oracle/deploy.sh
```

Requiere `deploy/oracle/.env.postgresql` y `.env.taskview` (no van a git).

Solo actualizar imágenes oficiales:

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@159.54.149.50 \
  'cd /opt/taskview && sudo docker compose pull && sudo docker compose up -d'
```

## Anti-patrones

- No exponer 8888/1725 a `0.0.0.0` (solo localhost + Caddy).
- No commitear `.env.*` con secretos.
- No volver a levantar `/opt/affine` sin pedido explícito del usuario.
