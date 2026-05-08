#!/bin/sh
set -eu

db_address="${DATABASE_ADDRESS:-${DATABASE_URL:-}}"

if [ -z "$db_address" ]; then
  echo "DATABASE_ADDRESS or DATABASE_URL is required." >&2
  exit 1
fi

case "$db_address" in
  postgres://*|postgresql://*)
    db_address="${db_address#*://}"
    db_address="${db_address%%\?*}"
    ;;
esac

attempt=1
until /nakama/nakama migrate up --database.address "$db_address"; do
  if [ "$attempt" -ge 12 ]; then
    echo "Database migrations failed after multiple attempts." >&2
    exit 1
  fi

  attempt=$((attempt + 1))
  echo "Database not ready yet, retrying migration ($attempt/12)..." >&2
  sleep 5
done

exec /nakama/nakama \
  --config /nakama/data/local.yml \
  --database.address "$db_address" \
  --socket.port "${PORT:-7350}"
