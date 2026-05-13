#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f "apps/web/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "apps/web/.env.local"
  set +a
fi

export SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
export SUPABASE_ARTIFACT_BUCKET="${SUPABASE_ARTIFACT_BUCKET:-test-artifacts}"
export METEORTEST_AGENT_TASK_SOURCE="${METEORTEST_AGENT_TASK_SOURCE:-web-console}"
export METEORTEST_AGENT_PRIVATE_PREVIEW_ONLY="${METEORTEST_AGENT_PRIVATE_PREVIEW_ONLY:-1}"

PYTHON_BIN="${METEORTEST_AGENT_PYTHON:-agent/.venv/bin/python}"
INTERVAL="${METEORTEST_AGENT_INTERVAL:-10}"

if [ ! -f "agent/config.yaml" ]; then
  echo "Missing agent/config.yaml. Copy agent/config.example.yaml to agent/config.yaml and update repository paths." >&2
  exit 1
fi

if [ -z "${SUPABASE_URL}" ]; then
  echo "Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL. Add it to apps/web/.env.local." >&2
  exit 1
fi

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to apps/web/.env.local or export it before starting." >&2
  exit 1
fi

if [ ! -x "$PYTHON_BIN" ]; then
  echo "Missing $PYTHON_BIN. Create the Agent virtualenv first:" >&2
  echo "  python3 -m venv agent/.venv" >&2
  echo "  agent/.venv/bin/python -m pip install -r agent/requirements.txt" >&2
  exit 1
fi

echo "Starting MeteorTest Local Agent with interval=${INTERVAL}s"
echo "Task filters: source=${METEORTEST_AGENT_TASK_SOURCE}, private_preview_only=${METEORTEST_AGENT_PRIVATE_PREVIEW_ONLY}"

AGENT_CMD=("$PYTHON_BIN" -m agent.agent --config agent/config.yaml --interval "$INTERVAL")

if [ "${METEORTEST_AGENT_CAFFEINATE:-1}" = "1" ] && command -v caffeinate >/dev/null 2>&1; then
  echo "Using caffeinate to keep macOS awake while Local Agent is running"
  exec caffeinate -dimsu "${AGENT_CMD[@]}"
fi

exec "${AGENT_CMD[@]}"
