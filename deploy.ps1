# Oref Shelter Timer - PowerShell Deployment Script (Windows Native)
# Usage: .\deploy.ps1 [dev|prod]

param(
    [ValidateSet("dev", "prod")]
    [string]$Mode = "prod"
)

# ============================================
# CONFIGURATION
# ============================================
$SSH_HOST = "tal@192.168.2.47"
$REMOTE_PATH = "/home/tal/docker/oref"
# ============================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "======================================" -ForegroundColor Yellow
Write-Host "Deploying Oref Shelter Timer ($Mode)" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Yellow
Write-Host ""

# Check SSH connection
Write-Host "[1/4] Testing SSH connection to $SSH_HOST..." -ForegroundColor Green
ssh -o ConnectTimeout=10 $SSH_HOST "echo connected" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Cannot connect to $SSH_HOST" -ForegroundColor Red
    exit 1
}
Write-Host "  SSH connection OK"

# Clean remote directory
Write-Host ""
Write-Host "[2/4] Syncing files to server..." -ForegroundColor Green
ssh $SSH_HOST "rm -rf $REMOTE_PATH && mkdir -p $REMOTE_PATH"

# Create tar archive excluding node_modules and .git, then extract on remote
Write-Host "  Creating archive and uploading..."

$tarFile = Join-Path $env:TEMP "oref-deploy.tar"

# Use tar to create archive (Windows 10+ has tar built-in)
Push-Location $ScriptDir
tar -cvf $tarFile --exclude="node_modules" --exclude=".git" --exclude="*.log" --exclude="deploy.ps1" --exclude="client/build" .
Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to create archive" -ForegroundColor Red
    exit 1
}

# Upload and extract
Write-Host "  Uploading..."
scp $tarFile "${SSH_HOST}:${REMOTE_PATH}/deploy.tar"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Upload failed" -ForegroundColor Red
    Remove-Item $tarFile -Force
    exit 1
}

Write-Host "  Extracting on server..."
ssh $SSH_HOST "cd $REMOTE_PATH && tar -xvf deploy.tar && rm deploy.tar"

# Cleanup local tar
Remove-Item $tarFile -Force

Write-Host "  Files synced"

# Build and start containers
Write-Host ""
Write-Host "[3/4] Building and starting containers..." -ForegroundColor Green

if ($Mode -eq "dev") {
    Write-Host "  Mode: DEVELOPMENT (test endpoints enabled)"
    ssh $SSH_HOST "cd $REMOTE_PATH && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build"
}
else {
    Write-Host "  Mode: PRODUCTION (test endpoints disabled)"
    ssh $SSH_HOST "cd $REMOTE_PATH && docker compose up -d --build"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker compose failed" -ForegroundColor Red
    exit 1
}

# Show status
Write-Host ""
Write-Host "[4/4] Checking container status..." -ForegroundColor Green
ssh $SSH_HOST "cd $REMOTE_PATH && docker compose ps"

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

if ($Mode -eq "dev") {
    Write-Host ""
    Write-Host "Test endpoints available:"
    Write-Host "  - /api/test-alert?area=<area_name>"
    Write-Host "  - /api/test-news-flash?instructions=<message>"
    Write-Host "  - /api/clear-test-alerts"
}
