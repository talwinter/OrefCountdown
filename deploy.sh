#!/bin/bash

# Oref Shelter Timer - Deployment Script
# Usage: ./deploy.sh [dev|prod]
#   dev  - Deploy with test endpoints enabled
#   prod - Deploy for production (test endpoints disabled)

set -e

# ============================================
# CONFIGURATION - Update these values
# ============================================
SSH_HOST="tal@192.168.2.47"      # Your Docker server SSH connection
REMOTE_PATH="/home/tal/docker/oref"  # Path on server where app is deployed
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory (where the project is)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default to production if no argument
MODE="${1:-prod}"

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
    echo -e "${RED}Error: Invalid mode '$MODE'. Use 'dev' or 'prod'${NC}"
    echo "Usage: ./deploy.sh [dev|prod]"
    exit 1
fi

echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}Deploying Oref Shelter Timer (${MODE})${NC}"
echo -e "${YELLOW}======================================${NC}"
echo ""

# Check if SSH_HOST is configured
if [[ "$SSH_HOST" == "user@192.168.x.x" ]]; then
    echo -e "${RED}Error: Please configure SSH_HOST in deploy.sh${NC}"
    echo "Edit the script and update the SSH_HOST variable with your server details."
    exit 1
fi

# Check SSH connection
echo -e "${GREEN}[1/4]${NC} Testing SSH connection to ${SSH_HOST}..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$SSH_HOST" exit 2>/dev/null; then
    echo -e "${RED}Error: Cannot connect to ${SSH_HOST}${NC}"
    echo "Make sure:"
    echo "  1. The server is reachable"
    echo "  2. SSH key authentication is set up"
    echo "  3. The SSH_HOST variable is correct"
    exit 1
fi
echo "  SSH connection OK"

# Sync files to server
echo ""
echo -e "${GREEN}[2/4]${NC} Syncing files to server..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude 'deploy.sh' \
    --exclude '.DS_Store' \
    --exclude 'client/build' \
    "$SCRIPT_DIR/" "${SSH_HOST}:${REMOTE_PATH}/"

echo "  Files synced"

# Determine which compose command to use
echo ""
echo -e "${GREEN}[3/4]${NC} Building and starting containers..."

if [[ "$MODE" == "dev" ]]; then
    echo "  Mode: DEVELOPMENT (test endpoints enabled)"
    ssh "$SSH_HOST" "cd ${REMOTE_PATH} && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build"
else
    echo "  Mode: PRODUCTION (test endpoints disabled)"
    ssh "$SSH_HOST" "cd ${REMOTE_PATH} && docker compose up -d --build"
fi

# Show status
echo ""
echo -e "${GREEN}[4/4]${NC} Checking container status..."
ssh "$SSH_HOST" "cd ${REMOTE_PATH} && docker compose ps"

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}======================================${NC}"

if [[ "$MODE" == "dev" ]]; then
    echo ""
    echo "Test endpoints available:"
    echo "  - /api/test-alert?area=רעננה"
    echo "  - /api/test-news-flash?instructions=הודעת בדיקה"
    echo "  - /api/clear-test-alerts"
fi
