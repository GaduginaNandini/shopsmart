# ShopSmart Troubleshooting Guide

## 1. PostgreSQL Connection Errors (`SQL_* must be set`)
- **Symptom:** App or `drizzle-kit push` exits with `SQL_HOST must be set` or `ECONNREFUSED`.
- **Fix:**
  1. Ensure `.env` exists (copy from `.env.example`) with `SQL_HOST`, `SQL_PORT`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, and `SQL_ADMIN_PASSWORD`.
  2. When running via Docker Compose, `SQL_HOST` must be `db` (already set in `docker-compose.yml`), not `localhost`.

## 2. Port 3000 or 3001 Already in Use
- **Symptom:** `EADDRINUSE` on startup or `docker compose up` fails to bind port `3000`.
- **Fix:** Stop any local Node dev server using port 3000 (`lsof -ti:3000 | xargs kill`) before starting Docker Compose, or change the host port mapping in `docker-compose.yml` (`"3080:3000"`).

## 3. `npm ci` Fails in Docker, GitHub Actions, or Jenkins
- **Symptom:** `npm ci` complains about missing `package-lock.json` or out-of-sync lockfile.
- **Fix:** Ensure `package-lock.json` is committed alongside `package.json`. Regenerate locally with `npm install --package-lock-only` if you add dependencies.

## 4. Selenium ChromeDriver Errors
- **Symptom:** `SessionNotCreatedException` or Chrome crashes in Linux CI/headless mode.
- **Fix:**
  1. Verify Google Chrome / Chromium is installed (`google-chrome --version`).
  2. Use Selenium >= 4.10 (built-in Selenium Manager automatically downloads matching ChromeDriver).
  3. Ensure ShopSmart is already running at `http://localhost:3000` (or set `SHOPSMART_URL`).

## 5. Newman `Register Customer` Returns 409 on Repeat Runs
- **Symptom:** Running the Postman collection twice with the same `customerEmail` returns `409 Conflict`.
- **Fix:** Both `201` and `409` are accepted by the `Register Customer` test script, and the subsequent `Login Customer` request signs in with `{{customerEmail}}` and stores a fresh `token`. To test a clean registration, change `customerEmail` in `postman/shopsmart.postman_environment.json`.

## 6. SonarQube Reports 0% Coverage
- **Symptom:** `sonar-scanner` succeeds but coverage displays `0.0%`.
- **Fix:** Run `npm run test:coverage` **before** running `sonar-scanner` so `coverage/lcov.info` exists, and keep `sonar.typescript.lcov.reportPaths=coverage/lcov.info` in `sonar-project.properties`.

## 7. Prometheus Target `shopsmart` Shows `DOWN`
- **Symptom:** Prometheus UI shows `Get "http://web:3000/metrics": dial tcp: lookup web`.
- **Fix:** Start both Compose files together so `prometheus` and `web` share the same Docker network:
  `docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build`
