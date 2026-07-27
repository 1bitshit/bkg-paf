#!/bin/bash
set -e
export AUTH_SECRET=$(openssl rand -base64 32)
echo "AUTH_SECRET=$AUTH_SECRET"
docker compose -f docker-compose.custom.yml build --no-cache
docker compose -f docker-compose.custom.yml up -d
sleep 15
curl -sf http://localhost:5003/api/health && echo "✅ http://localhost:5003" || echo "⏳ docker compose -f docker-compose.custom.yml logs -f"
