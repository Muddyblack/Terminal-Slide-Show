#!/bin/bash
#
# Docker and Git setup automation script
# Handles container management and git configuration
#
# Author: Muddyblack
# Date: 11.11.2024
# Version: 1.0

# -----------------------------------------------------------------------------
# Pre-flight check
# -----------------------------------------------------------------------------
# Refuse to pull over local changes instead of silently stashing them
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Uncommitted changes found - commit or stash them first" >&2
    exit 1
fi

# -----------------------------------------------------------------------------
# Container cleanup
# -----------------------------------------------------------------------------
docker compose down

# -----------------------------------------------------------------------------
# Git configuration
# -----------------------------------------------------------------------------
# Configure git pull strategy to create merge commits
git config pull.rebase false
git config pull.ff false
git config merge.commit no-edit

# -----------------------------------------------------------------------------
# Update repository
# -----------------------------------------------------------------------------
git pull --no-edit && chmod +x docker.sh

# -----------------------------------------------------------------------------
# Container management
# -----------------------------------------------------------------------------
# Rebuild containers without using cache
docker compose build --no-cache

# Start containers in background mode
docker compose up -d