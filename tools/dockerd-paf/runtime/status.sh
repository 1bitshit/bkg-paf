#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/opt/dockerd-paf}"
SOCKET="$ROOT/runtime/docker.sock"

if [[ -S "$SOCKET" ]]; then
  echo "dockerd-paf socket: ready"
else
  echo "dockerd-paf socket: missing"
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  DOCKER_HOST="unix://$SOCKET" docker info >/dev/null && echo "docker api: ready" || echo "docker api: unavailable"
fi
