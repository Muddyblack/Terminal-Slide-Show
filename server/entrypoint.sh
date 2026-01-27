#!/bin/sh
set -e

# Fix permissions for the downloads volume
# This allows the 'node' user to write to the mounted volume
if [ -d "/app/downloads" ]; then
    chown -R node:node /app/downloads
fi

# Execute the command as the 'node' user
exec su-exec node "$@"
