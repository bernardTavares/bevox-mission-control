#!/usr/bin/env bash
# smoke-service-path.sh
#
# Valida que o systemd user service `mission-control` tem PATH
# corretamente configurado para encontrar `openclaw` (instalado via
# npm global em ~/.npm-global/bin). Sem isso, /api/sessions, /api/cron,
# /api/health e similares quebram com spawn exit 127.
#
# Uso: bash deploy/smoke-service-path.sh
# Exit code: 0 ok, 1 falha.
set -euo pipefail

SERVICE=mission-control
EXPECTED_PATH_FRAGMENT="${HOME}/.npm-global/bin"

echo "==> verificando PATH no service ${SERVICE}"

# Lê Environment do service ativo (sem precisar do unit file no disco).
service_env=$(systemctl --user show "$SERVICE" -p Environment --value 2>/dev/null || true)

if [ -z "$service_env" ]; then
  echo "FAIL: Environment vazio no service. Provavelmente Environment= ausente no unit file." >&2
  exit 1
fi

if ! echo "$service_env" | grep -q "$EXPECTED_PATH_FRAGMENT"; then
  echo "FAIL: PATH do service não inclui $EXPECTED_PATH_FRAGMENT" >&2
  echo "  Environment lido: $service_env" >&2
  echo "  Fix: adicionar Environment=\"PATH=...\" no deploy/mission-control.service" >&2
  exit 1
fi
echo "  PATH inclui $EXPECTED_PATH_FRAGMENT  OK"

echo "==> verificando que o binário openclaw existe e é executável"
if [ ! -x "${HOME}/.npm-global/bin/openclaw" ]; then
  echo "FAIL: ${HOME}/.npm-global/bin/openclaw ausente ou não-executável" >&2
  exit 1
fi
echo "  openclaw executável  OK"

echo "==> verificando que o service consegue resolver openclaw via env --PATH"
# Reconstrói o PATH do service e tenta `command -v openclaw` num env limpo,
# simulando o que spawnSync herdaria.
service_path=$(echo "$service_env" | sed -n 's/.*PATH=\([^[:space:]]*\).*/\1/p' | tr -d '"')
if [ -z "$service_path" ]; then
  echo "FAIL: não consegui extrair PATH do Environment do service" >&2
  exit 1
fi
if ! env -i PATH="$service_path" HOME="$HOME" sh -c 'command -v openclaw' > /dev/null; then
  echo "FAIL: env -i PATH=\"$service_path\" não resolve openclaw" >&2
  exit 1
fi
echo "  service PATH resolve openclaw  OK"

echo ""
echo "==> ALL OK"
