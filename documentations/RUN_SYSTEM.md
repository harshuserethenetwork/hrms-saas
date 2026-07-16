# RUN_SYSTEM.md

# HRMS SaaS - Local Development Guide

Welcome!

This guide explains how to start the complete HRMS development environment.

---

# Requirements

Install the following software before running the project.

- Node.js 22+
- npm
- Docker Desktop
- Git
- VS Code (Recommended)

---

# Clone Repository

```bash
git clone <repository-url>
```

```bash
cd hrms-saas
```

---

# Install Dependencies

```bash
npm install
```

---

# Copy Environment File

```bash
cp .env.example .env.local
```

Windows PowerShell

```powershell
Copy-Item .env.example .env.local
```

---

# Start Infrastructure

The application uses Docker only for infrastructure services.

Run:

```bash
docker compose -f docker/compose/docker-compose.dev.yml up -d
```

This starts:

- PostgreSQL
- pgAdmin
- Redis
- Redis Insight
- Mailpit
- MinIO

Verify running containers:

```bash
docker ps
```

---

# Start Next.js

Run:

```bash
npm run dev
```

Application URL

```
http://localhost:3000
```

---

# Available Services

## Next.js

```
http://localhost:3000
```

---

## PostgreSQL

Host

```
localhost
```

Port

```
5432
```

Database

```
hrms
```

Username

```
postgres
```

Password

```
postgres
```

---

## pgAdmin

```
http://localhost:5050
```

Login

Email

```
admin@hrms.local
```

Password

```
admin123
```

---

## Redis

Host

```
localhost
```

Port

```
6379
```

---

## Redis Insight

```
http://localhost:5540
```

---

## Mailpit

```
http://localhost:8025
```

SMTP

```
localhost:1025
```

---

## MinIO

Console

```
http://localhost:9001
```

API

```
http://localhost:9000
```

Username

```
minioadmin
```

Password

```
minioadmin
```

---

# Stop Infrastructure

```bash
docker compose -f docker/compose/docker-compose.dev.yml down
```

---

# Remove Containers

```bash
docker compose -f docker/compose/docker-compose.dev.yml down -v
```

This also removes Docker volumes (database data, Redis data, MinIO data).

Use with caution.

---

# View Logs

View logs for all services

```bash
docker compose -f docker/compose/docker-compose.dev.yml logs
```

Follow logs

```bash
docker compose -f docker/compose/docker-compose.dev.yml logs -f
```

View PostgreSQL logs

```bash
docker compose -f docker/compose/docker-compose.dev.yml logs postgres
```

---

# Restart Infrastructure

```bash
docker compose -f docker/compose/docker-compose.dev.yml restart
```

---

# Common Docker Commands

Start

```bash
docker compose -f docker/compose/docker-compose.dev.yml up -d
```

Stop

```bash
docker compose -f docker/compose/docker-compose.dev.yml down
```

Restart

```bash
docker compose -f docker/compose/docker-compose.dev.yml restart
```

Check running containers

```bash
docker ps
```

Check all containers

```bash
docker ps -a
```

---

# Development Workflow

1. Pull the latest changes.
2. Start Docker infrastructure.
3. Start the Next.js application.
4. Develop your feature.
5. Commit changes.
6. Push to your feature branch.
7. Create a Pull Request into `develop`.

---

# Notes

- Never commit `.env.local`.
- Run the Next.js application locally using `npm run dev` for the best development experience.
- Docker is used only for infrastructure services during development.
- Use the production Dockerfile only for CI/CD and deployment.
