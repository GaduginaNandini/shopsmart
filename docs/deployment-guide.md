# ShopSmart Deployment & Operations Guide

## 1. Prerequisites
- **Local Runtime:** Node.js `22+`, npm `10+`, PostgreSQL `16` (or provisioned Cloud SQL PostgreSQL).
- **Containerized Runtime:** Docker Engine and Docker Compose v2 (`docker compose`).

## 2. Environment Variables
Copy `.env.example` to `.env` and set values appropriate for your environment:

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (default `3000`) | Express HTTP listen port |
| `SQL_HOST` | Yes | PostgreSQL hostname (`db` in Docker Compose) |
| `SQL_PORT` | Yes (`5432`) | PostgreSQL TCP port |
| `SQL_DB_NAME` | Yes | PostgreSQL database name |
| `SQL_USER` | Yes | Application DB username |
| `SQL_PASSWORD` | Yes | Application DB password |
| `SQL_ADMIN_USER` | Yes (for migrations) | Migration DB username |
| `SQL_ADMIN_PASSWORD` | Yes (for migrations) | Migration DB password |
| `SESSION_SECRET` | Recommended | HMAC secret for signing session Bearer tokens |
| `GEMINI_API_KEY` | Optional | Server-side key for `@google/genai` chatbot; falls back offline if empty |
| `OWNER_TOKEN` | Optional | Admin API header token (`X-Owner-Token`) for CI/Postman |

## 3. Local Production Deployment
```bash
npm ci
npx drizzle-kit push --config=src/db/drizzle.config.ts
npm run build
npm start
```

## 4. Docker & Docker Compose Deployment
`Dockerfile` packages Node 22, builds the client bundle (`public/assets/app.js`), runs TypeScript checks, pushes Drizzle schema migrations, and exposes port `3000` with a built-in `/health` check.

Start PostgreSQL (`pgdata` persistent volume) and the ShopSmart application:
```bash
docker compose up --build
```
Run in detached mode and verify container health:
```bash
docker compose up --build -d
docker compose ps
curl http://localhost:3000/health
```
Stop containers while preserving PostgreSQL data:
```bash
docker compose down
```

## 5. Prometheus & Grafana Monitoring Deployment
Start the app together with Prometheus (`9090`) and Grafana (`3001`):
```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build
```
- **Prometheus:** `http://localhost:9090` (Check `Status -> Targets` to verify `shopsmart` is `UP`; alert rules in `monitoring/alerts.yml`).
- **Grafana:** `http://localhost:3001` (default credentials `admin` / `admin`; pre-provisioned Prometheus datasource and `ShopSmart Operations Dashboard`).

## 6. CI/CD Pipelines
### GitHub Actions (`.github/workflows/ci.yml`)
Automatically runs on pushes to `main`/`master` and pull requests:
1. Checkout & Node.js 22 setup with npm cache
2. `npm ci`
3. `npm run typecheck` & `npm run lint`
4. `npm run test:coverage` (uploads `coverage/` artifact)
5. `npm run build`
6. Writes pass/fail status summary to `$GITHUB_STEP_SUMMARY`

### Jenkins (`Jenkinsfile`)
1. Open Jenkins -> **New Item** -> **Pipeline**.
2. Configure **Global Tool Configuration** with a NodeJS installation named `Node22`.
3. Under **Pipeline**, choose **Pipeline script from SCM** -> Git -> point to your GitHub repository (`Jenkinsfile` at repo root).
4. Trigger **Build Now** to run Checkout, Install Dependencies, TypeScript Validation, Lint, Automated Tests (`npm run test:coverage`), and Production Build.
