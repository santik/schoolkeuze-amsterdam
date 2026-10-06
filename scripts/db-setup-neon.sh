#!/bin/bash
set -e

# Load .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set."
  echo "Add it to .env or run: DATABASE_URL=... DATABASE_URL_UNPOOLED=... ./scripts/db-setup-neon.sh"
  exit 1
fi

# If DATABASE_URL_UNPOOLED is not set, use DATABASE_URL for both
export DATABASE_URL_UNPOOLED="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"

echo "Running migrations..."
npx prisma migrate deploy

echo "Ingesting sample schools..."
npx tsx scripts/ingest/sample.ts

echo "Done."
