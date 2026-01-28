# Oref Shelter Timer - Deployment Guide

## Prerequisites

1. **SSH key authentication** set up with your Docker server (no password prompts)
2. **rsync** installed in WSL (`sudo apt install rsync` if needed)
3. **Docker** and **Docker Compose** installed on the server

## Configuration

Edit `deploy.sh` and update these values if needed:

```bash
SSH_HOST="tal@192.168.2.47"          # Your Docker server SSH connection
REMOTE_PATH="/home/tal/docker/oref"  # Path on server where app is deployed
```

## Deployment Commands

From WSL terminal in the project directory:

```bash
# Development deployment (test endpoints enabled)
./deploy.sh dev

# Production deployment (test endpoints disabled)
./deploy.sh prod
```

## What Each Mode Does

| Mode | NODE_ENV | Test Endpoints | Use Case |
|------|----------|----------------|----------|
| `dev` | development | Enabled | Testing alerts before going live |
| `prod` | production | Disabled (404) | Live deployment |

## Test Endpoints (Development Only)

When deployed with `./deploy.sh dev`:

```bash
# Trigger a test alert
curl "http://SERVER:5300/api/test-alert?area=רעננה"

# Trigger multiple areas
curl "http://SERVER:5300/api/test-alert?areas=רעננה,תל אביב,חיפה"

# Trigger with custom migun time (seconds)
curl "http://SERVER:5300/api/test-alert?area=רעננה&migun_time=30"

# Trigger a news flash (early warning)
curl "http://SERVER:5300/api/test-news-flash?instructions=התרעה מוקדמת - איום טילים"

# Clear all test alerts
curl "http://SERVER:5300/api/clear-test-alerts"
```

## Deployment Workflow

1. **Make changes locally**
2. **Test with dev deployment:**
   ```bash
   ./deploy.sh dev
   ```
3. **Verify using test endpoints**
4. **Deploy to production:**
   ```bash
   ./deploy.sh prod
   ```

## What Gets Deployed

The script syncs all files except:
- `node_modules/`
- `.git/`
- `*.log`
- `.env`
- `deploy.sh`
- `client/build/` (rebuilt on server)

## Troubleshooting

### SSH Connection Failed
- Verify server is reachable: `ping 192.168.2.47`
- Test SSH manually: `ssh tal@192.168.2.47`
- Ensure SSH key is added: `ssh-add -l`

### Container Not Starting
```bash
# SSH to server and check logs
ssh tal@192.168.2.47
cd /home/tal/docker/oref
docker compose logs -f
```

### Rebuild From Scratch
```bash
ssh tal@192.168.2.47
cd /home/tal/docker/oref
docker compose down
docker compose up -d --build --force-recreate
```
