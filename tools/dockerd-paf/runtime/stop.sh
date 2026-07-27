#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/opt/dockerd-paf}"
PIDFILE="$ROOT/runtime/docker.pid"

if [[ -f "$PIDFILE" ]]; then
  kill "$(cat "$PIDFILE")" || true
  echo "dockerd-paf stopped"
else
  echo "no dockerd-paf pid file found"
fi
