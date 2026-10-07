#!/usr/bin/env bash
# Deploy TaskView CE to Oracle Free VM (replaces AFFiNE on same domain).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOST="${ORACLE_HOST:-159.54.149.50}"
USER="${ORACLE_SSH_USER:-ubuntu}"
KEY="${ORACLE_SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_DIR="${ORACLE_TASKVIEW_DIR:-/opt/taskview}"
DOMAIN="${TASKVIEW_DOMAIN:-affine-uribe.duckdns.org}"

SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "${USER}@${HOST}")
SCP=(scp -i "$KEY" -o StrictHostKeyChecking=accept-new)

if [[ ! -f "$ROOT/.env.postgresql" || ! -f "$ROOT/.env.taskview" ]]; then
  echo "Missing $ROOT/.env.postgresql or $ROOT/.env.taskview"
  echo "Copy the *.example files, fill secrets, then re-run."
  exit 1
fi

echo "==> Ensure remote dir $REMOTE_DIR"
"${SSH[@]}" "sudo mkdir -p '$REMOTE_DIR/logs' && sudo chown -R ${USER}:${USER} '$REMOTE_DIR'"

echo "==> Upload compose + env"
"${SCP[@]}" \
  "$ROOT/docker-compose.yml" \
  "$ROOT/.env.postgresql" \
  "$ROOT/.env.taskview" \
  "${USER}@${HOST}:${REMOTE_DIR}/"

echo "==> Upload Caddyfile"
"${SCP[@]}" "$ROOT/Caddyfile" "${USER}@${HOST}:/tmp/Caddyfile.taskview"
"${SSH[@]}" "sudo mv /tmp/Caddyfile.taskview /etc/caddy/Caddyfile && sudo caddy validate --config /etc/caddy/Caddyfile"

echo "==> Backup + stop AFFiNE (if present)"
"${SSH[@]}" bash -s <<'REMOTE'
set -euo pipefail
sudo mkdir -p /opt/backups
if [[ -d /opt/affine ]]; then
  TS=$(date +%Y%m%d-%H%M%S)
  echo "Backing up /opt/affine -> /opt/backups/affine-${TS}.tar.gz"
  sudo tar -czf "/opt/backups/affine-${TS}.tar.gz" -C /opt affine || true
  if [[ -f /opt/affine/docker-compose.yml ]]; then
    (cd /opt/affine && sudo docker compose down) || true
  fi
fi
# Stop any leftover affine containers by name
sudo docker rm -f affine_server affine_redis affine_postgres affine_migration_job 2>/dev/null || true
REMOTE

echo "==> Pull + start TaskView"
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
cd '$REMOTE_DIR'
sudo docker compose pull
sudo docker compose up -d
sudo docker compose ps
sudo systemctl reload caddy
REMOTE

echo "==> Smoke check"
sleep 5
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
curl -fsS -o /dev/null -w 'web local: %{http_code}\n' http://127.0.0.1:8888/ || true
curl -fsS -o /dev/null -w 'api local: %{http_code}\n' http://127.0.0.1:1725/module/about || true
curl -fsSk -o /dev/null -w 'https site: %{http_code}\n' "https://$DOMAIN/" || true
curl -fsSk -o /dev/null -w 'https api: %{http_code}\n' "https://$DOMAIN/module/about" || true
REMOTE

echo "Done. Open https://${DOMAIN}/"
echo "Default login (change immediately): user / user1!#Q"
