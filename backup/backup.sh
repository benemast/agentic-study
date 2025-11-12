#!/bin/sh
set -e

echo "Starting backup at $(date)"

# Create backup directory if it doesn't exist
mkdir -p /backups

# Backup filename with timestamp
BACKUP_FILE="/backups/postgres_$(date +%Y%m%d_%H%M%S).sql"

# Create PostgreSQL backup
PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h postgres -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_FILE

# Compress the backup
gzip $BACKUP_FILE

echo "Backup completed: ${BACKUP_FILE}.gz"

# Optional: Keep only last 7 days of backups
find /backups -name "postgres_*.sql.gz" -mtime +7 -delete

# Optional: Upload to S3 (uncomment if configured)
# if [ -n "$S3_BUCKET" ]; then
#   aws s3 cp ${BACKUP_FILE}.gz s3://$S3_BUCKET/backups/
#   echo "Uploaded to S3"
# fi

# Sleep for 24 hours before next backup
sleep 86400

# Loop to run daily
exec "$0"