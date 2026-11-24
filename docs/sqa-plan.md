# Software Quality Assurance (SQA) Plan — ShopSmart

## 1. Objectives
Ensure correctness of pricing/checkout business rules, data integrity in PostgreSQL, security of authentication and authorization, and reliability of the AI support chatbot.

## 2. Quality Gates
1. **Static Type Checking**: `npm run lint` (`tsc --noEmit`) with TypeScript `strict: true` across server, client, and tests.
2. **Client Bundle Verification**: `npm run build` compiles `src/client/main.ts` cleanly with `esbuild` and validates all types.
3. **Unit & API Integration Testing**: `npm test` (`vitest run`) executes unit tests (`pricing`, `chatbot`, `session`) and Supertest API integration tests.
4. **Static Analysis (External)**: `sonar-project.properties` configures SonarQube scanning on `server.ts`, `src/`, and `tests/`.
5. **E2E & Performance (External)**: `selenium_tests/` for browser verification and `loadtest/locustfile.py` for concurrent load testing.
6. **Runtime Monitoring**: `/health` and `/metrics` endpoints scraped by Prometheus (`monitoring/prometheus.yml`) with alerts (`monitoring/alerts.yml`) and Grafana visualization (`monitoring/grafana/dashboards/shopsmart.json`).
