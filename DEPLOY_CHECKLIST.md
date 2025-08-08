# Production Deployment Checklist & Commands

This document provides a quick checklist and commands for deploying the application to a production environment.

## 1. Pre-Deployment Checklist

- [ ] **.env.production:** Create and populate the `.env.production` file with all required secrets and configurations.
  - `SESSION_SECRET`: Must be a long, random, and unique string.
  - `EMAIL_USER`, `EMAIL_PASS`: Set up your application-specific email credentials.
  - `ADMIN_EMAILS`: List the email addresses for admin access.
  - `FRONTEND_URL`: Set the correct URL for your production frontend.

- [ ] **Nginx Configuration:** If using the provided `nginx.conf` as a template, ensure:
  - `server_name` is updated to your domain.
  - SSL certificate paths (`ssl_certificate`, `ssl_certificate_key`) are correct. It is highly recommended to use Certbot for managing Let's Encrypt certificates.

- [ ] **Firewall:** Ensure ports 80 (HTTP) and 443 (HTTPS) are open on your server.

## 2. Build and Deploy with Docker Compose

These commands should be run on your production server.

### Build the images
Builds the application image based on the multi-stage `Dockerfile`.

```bash
docker-compose -f docker-compose.yml build
```

### Start the services
Starts all services (app, mongo, redis) in detached mode.

```bash
docker-compose -f docker-compose.yml up -d
```

## 3. Post-Deployment Verification

### Check container status
Verify that all containers are running and healthy.

```bash
docker-compose -f docker-compose.yml ps
```

Look for `Up` status and the health status of the `app` service (it should show `(healthy)` after the initial start-up period).

### View logs
Check the application logs for any errors during startup or operation.

```bash
# View logs for the app service
docker-compose -f docker-compose.yml logs -f app

# View logs for all services
docker-compose -f docker-compose.yml logs -f
```

### Test the healthcheck endpoint
Manually check the liveness probe to ensure the application is responsive.

```bash
curl http://localhost:3000/health/liveness
```

## 4. Stopping the Application

To stop and remove the containers:

```bash
docker-compose -f docker-compose.yml down
```

To stop without removing the containers:

```bash
docker-compose -f docker-compose.yml stop
```
