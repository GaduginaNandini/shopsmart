# Submission Evidence & Execution Status

This file tracks what has been executed and verified in this environment versus what requires external tooling.

## Executed & Verified in This Environment
- **PostgreSQL Provisioning & Schema Migration**:
  - Cloud SQL PostgreSQL instance provisioned (`src/db/schema.ts`, `src/db/drizzle.config.ts`).
  - Drizzle SQL migration generated (`drizzle/0000_free_speedball.sql`) and pushed to PostgreSQL.
  - All 7 tables (`users`, `products`, `carts`, `cart_items`, `orders`, `order_items`, `support_tickets`) verified via `information_schema.columns` query.
  - Initial 4 products (`Notebook`, `Pen Set`, `Desk Lamp`, `Backpack`) seeded in PostgreSQL.
- **Build & Type Check**:
  - `npm run build` (`esbuild` client bundle + `tsc --noEmit`) passed with 0 errors.
  - `npm run lint` (`tsc --noEmit`) passed with 0 errors.
- **Automated Unit & API Integration Tests**:
  - `npm test` (`vitest run`) passed: 4 test files (`tests/pricing.test.ts`, `tests/chatbot.test.ts`, `tests/session.test.ts`, `tests/api.integration.test.ts`), 22 tests passing.

## Requires External Execution
The following configurations are complete and aligned with port `3000`, but were not executed here because external runtimes/daemons (Docker daemon, Chrome/WebDriver, Locust, SonarQube server, Jenkins server) are outside this container:
- `docker compose up --build` (Docker container build & local Postgres stack)
- `docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build` (Prometheus + Grafana)
- `pytest selenium_tests` (Selenium + Chrome browser journeys)
- `locust -f loadtest/locustfile.py --host http://localhost:3000` (Load testing)
- `sonar-scanner` (SonarQube analysis) and Jenkins pipeline execution
- Postman runner against `postman/shopsmart.postman_collection.json`
