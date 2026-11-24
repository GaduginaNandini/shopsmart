# Software Quality Assurance (SQA) Plan — ShopSmart

## 1. Objectives
Ensure correctness of pricing and checkout business rules, PostgreSQL transactional integrity, authentication/authorization security, Responsible AI guardrails, and repeatable CI/CD quality verification.

## 2. Quality Gates
1. **Static Type Checking (`npm run typecheck`) & Linting (`npm run lint`):** Strict TypeScript (`strict: true`) across `server.ts`, `src/`, and `tests/`.
2. **Production Build (`npm run build`):** Bundles `src/client/main.ts` to `public/assets/app.js` with `esbuild` and validates TypeScript compilation.
3. **Unit & API Integration Testing (`npm run test:coverage`):** Executes Vitest (`pricing`, `chatbot`, `session`) and Supertest HTTP API integration tests without depending on production data, producing `coverage/lcov.info`.
4. **Static Analysis (External — SonarQube):** `sonar-project.properties` configures scanning over `server.ts`, `src/`, and `tests/` with V8 LCOV coverage ingestion.
5. **E2E, API & Load Testing (External):** `selenium_tests/` (Page Object Model), `postman/shopsmart.postman_collection.json` (Newman), and `loadtest/locustfile.py` (Locust).
6. **Runtime Observability:** `/health` and `/metrics` endpoints scraped by Prometheus (`monitoring/prometheus.yml`) with alerts (`monitoring/alerts.yml`) and Grafana visualization (`monitoring/grafana/dashboards/shopsmart.json`).
