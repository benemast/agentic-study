#!/bin/sh
# wait-for-postgres.sh

set -e

host="$1"
shift

echo "Waiting for postgres at $host..."
echo "Using database: $POSTGRES_DB, user: $POSTGRES_USER"

# Wait for postgres to be ready
until pg_isready -h "$host" -U "$POSTGRES_USER" > /dev/null 2>&1; do
  echo "Postgres is unavailable - sleeping"
  sleep 2
done

echo "Postgres is up - running migrations"
cd /app && python -m alembic upgrade head

echo "Migrations complete - starting application"
exec "$@"