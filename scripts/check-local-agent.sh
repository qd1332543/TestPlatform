#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LABEL="com.meteortest.local-agent"

if [ -f "apps/web/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "apps/web/.env.local"
  set +a
fi

export SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"

AGENT_NAME="$(
  agent/.venv/bin/python - <<'PY' 2>/dev/null || printf 'local-mac-01'
import yaml
from pathlib import Path
config = yaml.safe_load(Path("agent/config.yaml").read_text(encoding="utf-8"))
print(config.get("agent", {}).get("name") or "local-mac-01")
PY
)"

echo "Local process supervisor:"
if launchctl list | grep -q "$LABEL"; then
  launchctl list | grep "$LABEL"
else
  echo "  ${LABEL} is not loaded"
fi

echo
echo "Local logs:"
echo "  .meteortest-agent/logs/launchd.out.log"
echo "  .meteortest-agent/logs/launchd.err.log"

if [ -z "${SUPABASE_URL}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo
  echo "Supabase status: skipped. SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing."
  exit 0
fi

AUTH_HEADERS=(
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}"
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
)

echo
echo "Supabase executor row:"
curl -fsS "${SUPABASE_URL}/rest/v1/executors?name=eq.${AGENT_NAME}&select=id,name,type,status,last_heartbeat_at" "${AUTH_HEADERS[@]}"

echo
echo
echo "Recent tasks claimed by ${AGENT_NAME}:"
EXECUTOR_ID="$(
  curl -fsS "${SUPABASE_URL}/rest/v1/executors?name=eq.${AGENT_NAME}&select=id&limit=1" "${AUTH_HEADERS[@]}" \
    | agent/.venv/bin/python -c 'import json,sys; rows=json.load(sys.stdin); print(rows[0]["id"] if rows else "")'
)"

if [ -z "$EXECUTOR_ID" ]; then
  echo "[]"
  exit 0
fi

curl -fsS "${SUPABASE_URL}/rest/v1/tasks?executor_id=eq.${EXECUTOR_ID}&select=id,status,environment,started_at,finished_at,created_at&order=created_at.desc&limit=5" "${AUTH_HEADERS[@]}"

echo
