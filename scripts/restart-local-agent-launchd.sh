#!/usr/bin/env bash
set -euo pipefail

LABEL="com.meteortest.local-agent"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"

if [ ! -f "$PLIST_PATH" ]; then
  echo "Missing ${PLIST_PATH}. Run ./scripts/install-local-agent-launchd.sh first." >&2
  exit 1
fi

launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl load "$PLIST_PATH"

echo "Restarted ${LABEL}"
