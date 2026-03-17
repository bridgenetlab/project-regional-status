# Docker Setup — Site Location Dashboard

Your dashboard is now containerized and ready to deploy! 🐳

## Quick Start

### 1. Build & Run Locally

```bash
# Build the Docker image
docker build -t site-dashboard .

# Run the container
docker run -p 3000:80 site-dashboard

# Or use docker-compose
docker-compose up --build
```

Then open: **http://localhost:3000**

### 2. Stop the Container

```bash
docker-compose down
```

## What's Included

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build (nginx-based for static serving) |
| `nginx.conf` | Web server config with gzip, caching, security headers |
| `.dockerignore` | Files excluded from Docker image |
| `docker-compose.yml` | Local development orchestration |
| `.github/workflows/docker-publish.yml` | CI/CD pipeline (auto-publish on push) |
| `unraid-template.xml` | Unraid container template |

## Deployment Options

### Option 1: Docker Hub / GHCR (GitHub Container Registry)

Push to your own registry:

```bash
# Build and tag
docker build -t ghcr.io/YOUR_USERNAME/site-dashboard:latest .

# Login to GHCR
docker login ghcr.io

# Push
docker push ghcr.io/YOUR_USERNAME/site-dashboard:latest
```

### Option 2: GitHub Actions (Automatic)

When you push to GitHub:
1. GitHub Actions automatically builds and pushes to GHCR
2. Runs on every push to `main` or tag like `v1.0.0`
3. Image available at: `ghcr.io/YOUR_USERNAME/site-dashboard:latest`

### Option 3: Unraid

1. Copy `unraid-template.xml` to your Unraid server:
   ```bash
   scp unraid-template.xml root@<UNRAID_IP>:/boot/config/plugins/dockerMan/templates-user/site-dashboard.xml
   ```

2. In Unraid UI:
   - Docker → Add Container
   - Select "site-dashboard"
   - Set port to `3000` (or your preferred port)
   - Click "Apply"

3. Dashboard will be available at: `http://<UNRAID_IP>:3000`

## Environment Variables

Currently, the dashboard doesn't require any environment variables. Your Google Maps API key is stored in the browser's local storage.

## Troubleshooting

### Port Already in Use

Change the port in `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Use 8080 instead of 3000
```

### Docker Image Size

Current image: ~30MB (nginx:alpine is lightweight)

### Security

The nginx config includes:
- Gzip compression (faster loading)
- Cache headers (1 year for static assets)
- Security headers (XSS protection, MIME type sniffing prevention)
- SPA routing (all requests → index.html)

## Next Steps

1. **Push to GitHub** (optional):
   ```bash
   git init
   git add .
   git commit -m "Add Docker containerization"
   git remote add origin https://github.com/YOUR_USERNAME/site-dashboard.git
   git push -u origin main
   ```

2. **Update GHCR image name** in:
   - `.github/workflows/docker-publish.yml`
   - `unraid-template.xml`

3. **Enable GitHub Actions** in your repo settings

---

For questions or issues, check Docker logs:
```bash
docker-compose logs -f site-dashboard
```
