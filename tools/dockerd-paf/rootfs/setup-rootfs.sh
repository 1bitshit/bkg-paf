#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/opt/dockerd-paf}"
SYSTEM="$ROOT/system"
USER_NAME="dockerd-paf"
UBUNTU_SUITE="${2:-noble}"
MIRROR="${DEBIAN_MIRROR:-http://archive.ubuntu.com/ubuntu}"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root"
  exit 1
fi

mkdir -p "$SYSTEM"

if [[ ! -x "$SYSTEM/bin/bash" ]]; then
  debootstrap --variant=minbase "$UBUNTU_SUITE" "$SYSTEM" "$MIRROR"
fi

chroot "$SYSTEM" /bin/bash <<EOF
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl sudo uidmap rootlesskit slirp4netns fuse-overlayfs nftables containerd git
EOF

if ! grep -q "^$USER_NAME:" "$SYSTEM/etc/passwd"; then
  chroot "$SYSTEM" useradd -m -s /bin/bash "$USER_NAME"
fi

USER_ID="$(chroot "$SYSTEM" id -u "$USER_NAME")"
mkdir -p "$SYSTEM/run/user/$USER_ID"
chroot "$SYSTEM" chown "$USER_NAME:$USER_NAME" "/run/user/$USER_ID"

if ! grep -q "^$USER_NAME:" "$SYSTEM/etc/subuid" 2>/dev/null; then
  echo "$USER_NAME:100000:65536" >> "$SYSTEM/etc/subuid"
fi

if ! grep -q "^$USER_NAME:" "$SYSTEM/etc/subgid" 2>/dev/null; then
  echo "$USER_NAME:100000:65536" >> "$SYSTEM/etc/subgid"
fi

echo "rootfs ready: $SYSTEM"
