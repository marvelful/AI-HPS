# AI-HPS Production Deployment Runbook

This runbook tracks the production setup for AI-HPS on DigitalOcean, GitHub Actions, and Namecheap.

## Current Production Targets

- VPS provider: DigitalOcean
- VPS public IPv4: `206.189.27.60`
- VPS SSH user: `root`
- Domain registrar/DNS: Namecheap
- Production domain: `aihps.tech`
- GitHub repository: `marvelful/AI-HPS`
- Deployment workflow: `.github/workflows/deploy-vps.yml`
- Production deploy script: `scripts/deploy-vps.sh`

## Current Verified Server State

The DigitalOcean VPS already has:

- Docker installed
- Docker Compose installed
- Firewall open for SSH, HTTP, and HTTPS
- AI-HPS containers running through Docker Compose
- Staff/admin app served through Caddy
- Backend services running behind Caddy

The app is currently reachable by IP:

- Web app: `http://206.189.27.60`
- Pipeline health: `http://206.189.27.60/api/pipeline/health`

## GitHub Actions Secrets

Go to:

`GitHub repository > Settings > Secrets and variables > Actions > Repository secrets`

Create or update these repository secrets:

```text
VPS_HOST=206.189.27.60
VPS_USER=root
VPS_SSH_PORT=22
VPS_SSH_KEY=<full private key content>
```

The secret names must match exactly. For example, do not create a secret named `aihps` for the private key. The workflow reads only `VPS_SSH_KEY`.

`VPS_SSH_KEY` must contain the full private key from the local machine:

```text
C:\Users\PERKINGSTHON-CORP'S\.ssh\aihps_do_prod
```

Copy the entire key, including:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

Do not use the SSH key filename as `VPS_USER`. The correct `VPS_USER` is `root`.

## Namecheap DNS

Go to:

`Namecheap > Domain List > aihps.tech > Manage > Advanced DNS`

Remove old GitHub Pages records:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Add these records:

```text
Type: A Record
Host: @
Value: 206.189.27.60
TTL: Automatic
```

```text
Type: A Record
Host: www
Value: 206.189.27.60
TTL: Automatic
```

Do not keep both an `A Record` and a `CNAME Record` for `www`. If `A Record www -> 206.189.27.60` exists, remove `CNAME www -> aihps.tech.`.

After DNS is saved, wait for propagation. It can be quick, but it may take several hours.

## Deployment Flow

1. Push code to `master`.
2. GitHub runs `CI`.
3. If `CI` succeeds, GitHub runs `Deploy VPS`.
4. `Deploy VPS` creates a release archive.
5. The archive is uploaded to `/tmp/aihps-release.tgz` on the VPS.
6. The workflow extracts `scripts/deploy-vps.sh` from that archive.
7. The deploy script preserves VPS-only env files, unpacks the release into `/opt/aihps`, builds containers, and restarts the stack.

## VPS Environment Files

These files live only on the VPS and must not be committed:

```text
/opt/aihps/.env.prod
/opt/aihps/backend/.env
```

The deploy script preserves them during archive deployments.

## Final HTTPS Cutover

After `aihps.tech` resolves to `206.189.27.60`, update the VPS production domain value:

```text
AIHPS_DOMAIN=aihps.tech, www.aihps.tech
```

Then restart the stack. Caddy will request and renew HTTPS certificates automatically.

Expected final URLs:

```text
https://aihps.tech
https://aihps.tech/api/pipeline/health
```

## Verification Checklist

Use these checks after DNS and deployment:

```text
aihps.tech resolves to 206.189.27.60
www.aihps.tech resolves to 206.189.27.60
GitHub CI succeeds
GitHub Deploy VPS succeeds
https://aihps.tech returns HTTP 200
https://aihps.tech/api/pipeline/health returns status ok
All Docker Compose services are running on the VPS
```
