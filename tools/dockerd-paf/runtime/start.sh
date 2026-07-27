#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/opt/dockerd-paf}"
SYSTEM="$ROOT/system"
RUNTIME="$ROOT/runtime"
SOCKET="$RUNTIME/docker.sock"
RUNTIME_USER="dockerd-paf"

if [[ ! -x "$SYSTEM/bin/bash" ]]; then
  echo "Missing runtime rootfs: $SYSTEM"
  exit 1
fi

USER_ID="$(chroot "$SYSTEM" id -u "$RUNTIME_USER")"
GROUP_ID="$(chroot "$SYSTEM" id -g "$RUNTIME_USER")"

mkdir -p "$RUNTIME/docker-data" "$RUNTIME/docker-exec" "$RUNTIME/rootlesskit"
mkdir -p "$SYSTEM/run/user/$USER_ID"

exec chroot "$SYSTEM" /bin/bash -lc "
export HOME=/home/$RUNTIME_USER
export XDG_RUNTIME_DIR=/run/user/$USER_ID
export DOCKER_HOST=unix://$SOCKET
exec rootlesskit --state-dir=$RUNTIME/rootlesskit \\
 --net=slirp4netns \\
 --copy-up=/etc \\
 --copy-up=/run \\
 dockerd-rootless.sh \\
 --data-root=$RUNTIME/docker-data \\
 --exec-root=$RUNTIME/docker-exec \\
 -H unix://$SOCKET
"
