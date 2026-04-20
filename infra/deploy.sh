#!/usr/bin/env bash
# First-time deploy on a fresh Ubuntu 24.04 VPS.
# Run as root (via `bash deploy.sh`) or prefix non-sudo steps with sudo.
set -euo pipefail

REPO_URL="${REPO_URL:-}"
APP_DIR="${APP_DIR:-/opt/resumai}"

echo "==> Installing base packages"
apt-get update -y
apt-get install -y curl ca-certificates git jq ufw

echo "==> Installing Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "==> Firewall"
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

echo "==> Clone/pull app"
if [[ -n "$REPO_URL" ]]; then
  if [[ ! -d "$APP_DIR/.git" ]]; then
    git clone "$REPO_URL" "$APP_DIR"
  else
    git -C "$APP_DIR" fetch --all --prune
    git -C "$APP_DIR" reset --hard origin/main
  fi
fi

cd "$APP_DIR/infra"

if [[ ! -f .env ]]; then
  echo "==> No .env found in $APP_DIR/infra — copy .env.example there and fill in keys, then re-run."
  cp -n "$APP_DIR/.env.example" .env
  exit 1
fi

echo "==> Building images"
docker compose -f compose.yml build --pull

echo "==> Running Drizzle migrations against the live DB"
docker compose -f compose.yml up -d postgres
sleep 6
docker compose -f compose.yml run --rm api sh -c "cd /app/apps/api && npx drizzle-kit push --force"

echo "==> Bringing up the full stack"
docker compose -f compose.yml up -d

echo "==> Waiting for healthchecks"
for i in {1..30}; do
  if curl -fsS http://127.0.0.1/api/health >/dev/null 2>&1; then
    echo "✓ API healthy"
    break
  fi
  sleep 2
done

echo "==> Deployed. Logs:"
docker compose -f compose.yml ps
echo
echo "Tail logs with:  cd $APP_DIR/infra && docker compose logs -f"
