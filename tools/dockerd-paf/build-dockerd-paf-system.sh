#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/opt/dockerd-paf}"
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

SYSTEM="$ROOT/system"
RUNTIME="$ROOT/runtime"
HOME_DIR="$ROOT/home"
STACKS="$ROOT/stacks"
LOGS="$ROOT/logs"
CONFIG="$ROOT/config"

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo $0 [path]"
  exit 1
fi

for dir in "$SYSTEM" "$RUNTIME" "$HOME_DIR" "$STACKS" "$LOGS" "$CONFIG"; do
  mkdir -p "$dir"
done

apt-get update
apt-get install -y debootstrap

"$BASE_DIR/rootfs/setup-rootfs.sh" "$ROOT"
"$BASE_DIR/rootfs/install-docker.sh" "$SYSTEM"

cat > "$CONFIG/runtime.env" <<EOF
DOCKER_ROOT=$RUNTIME/docker-data
STACK_ROOT=$STACKS
DOCKER_SOCKET=$RUNTIME/docker.sock
EOF

mkdir -p "$RUNTIME/docker-data" "$RUNTIME/docker-exec"
mkdir -p "$HOME_DIR/dockerd-paf/.config/docker"

install -m 0755 "$BASE_DIR/runtime/start.sh" "$RUNTIME/start.sh"
install -m 0644 "$BASE_DIR/systemd/dockerd-paf.service" "$CONFIG/dockerd-paf.service"

echo "dockerd-paf system created at $ROOT"
echo "Runtime: $RUNTIME"
echo "Socket: $RUNTIME/docker.sock"
