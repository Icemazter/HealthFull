#!/bin/bash

# HealthFull iOS Update Script
# Quick update deployment after code changes

echo "🚀 Deploying HealthFull update..."

# Push update to production
eas update --branch production --message "$(git log -1 --pretty=%B 2>/dev/null || echo 'Manual update')"

echo "✅ Update deployed! Changes will appear on devices shortly."
