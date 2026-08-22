#!/usr/bin/env bash
set -e

UNRAID="root@192.168.1.225"
DATA_DIR="/mnt/user/appdata/osrs-bingo/data"
APP_DIR="/mnt/user/appdata/osrs-bingo/app"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "==> [1/4] Syncing code to Unraid..."
rsync -av --exclude='/.env' --exclude='/node_modules' --exclude='/client/node_modules' --exclude='/.git' \
  /var/home/josephfarah/git/osrs-bingo/ "$UNRAID:$APP_DIR/"

echo "==> [2/4] Building Docker image..."
ssh "$UNRAID" "cd $APP_DIR && docker build -t osrs-bingo . 2>&1 | tail -5"

echo "==> [3/4] Stopping container and snapshotting database..."
ssh "$UNRAID" "
  docker stop osrs-bingo 2>/dev/null || true
  mkdir -p $DATA_DIR/backups/pre-deploy
  if [ -f $DATA_DIR/bingo.db ]; then
    cp $DATA_DIR/bingo.db $DATA_DIR/backups/pre-deploy/bingo-$TIMESTAMP.db
    echo '[Backup] Pre-deploy snapshot saved: bingo-$TIMESTAMP.db'
  else
    echo '[Backup] No database found — skipping snapshot'
  fi
  docker rm osrs-bingo 2>/dev/null || true
"

echo "==> [4/4] Starting new container..."
ssh "$UNRAID" "docker run -d --name osrs-bingo \
  -p 3100:3001 \
  -v $DATA_DIR:/app/data \
  -e DATA_DIR=/app/data \
  --env-file /mnt/user/appdata/osrs-bingo/.env \
  --restart unless-stopped osrs-bingo"

sleep 3
ssh "$UNRAID" "docker logs osrs-bingo --tail 10"

echo ""
echo "==> Deploy complete."
