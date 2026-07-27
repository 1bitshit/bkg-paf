#!/usr/bin/env bash
set -euo pipefail

SYSTEM="${1:-/opt/dockerd-paf/system}"
SUITE="${2:-noble}"

if [[ ! -x "$SYSTEM/bin/bash" ]]; then
  echo "missing rootfs: $SYSTEM"
  exit 1
fi

chroot "$SYSTEM" /bin/bash <<EOF
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl ca-certificates gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $SUITE stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce-rootless-extras docker-compose-plugin containerd
EOF

echo "docker rootless packages installed in $SYSTEM"
