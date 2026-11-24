# ShopSmart — E-Commerce Platform with AI Support Chatbot

**Course:** Integrated Project P03 — AI in Software Engineering

ShopSmart is a full-stack e-commerce platform built with **Express**, **TypeScript**, **PostgreSQL (Drizzle ORM)**, **Firebase Authentication**, and the **Gemini AI (`@google/genai`)** customer-support chatbot.

## Architecture
```
Browser (Dark-Mode Storefront, PDP Modal, Cart, Orders, Admin, AI Chat)
   │
   └── Express + TypeScript API (port 3000)
          ├── PostgreSQL via Drizzle ORM (users, products, carts, cart_items, orders, order_items, support_tickets)
          ├── Auth: scrypt + HMAC Bearer sessions & Firebase Google Sign-In
          ├── Pricing Engine: 5% bulk discount (10+ units), SAVE10 coupon, half-up rounding
          ├── Observability: /health & Prometheus /metrics
          └── AI Support Chatbot (@google/genai gemini-4-hydrogen)
                 ├── Email-verified order status lookup
                 ├── Policy-grounded Gemini responses (src/chatbot/policy.md)
                 ├── Offline keyword retrieval fallback
                 └── Human escalation persisted to support_tickets
```

## Quick Start (Local / Node 22)
1. Copy `.env.example` to `.env` and set `SQL_HOST`, `SQL_PORT`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`, and optional `SESSION_SECRET`, `GEMINI_API_KEY`, `OWNER_TOKEN`.
2. Install dependencies, push schema migrations, build, and start:
   ```bash
   npm install
   npx drizzle-kit push --config=src/db/drizzle.config.ts
   npm run build
   npm run dev
   ```
   The server listens on `http://0.0.0.0:3000`.

## Verification Commands
```bash
npm run typecheck      # TypeScript type-checking (tsc --noEmit)
npm run lint           # Lint check (tsc --noEmit)
npm test               # Vitest unit & Supertest API integration tests
npm run test:coverage  # Vitest suite + coverage/lcov.info for SonarQube
npm run build          # Client bundle (esbuild) + TypeScript check
```

## Docker, Monitoring & External QA
- **Docker Compose:** `docker compose up --build` (PostgreSQL 16 + ShopSmart app + persistent `pgdata` volume + healthchecks)
- **Prometheus & Grafana:** `docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build` (Prometheus on `:9090`, Grafana on `:3001`)
- **CI/CD:** `.github/workflows/ci.yml` (GitHub Actions) and `Jenkinsfile` (Jenkins)
- **Postman / Newman:** `npx newman run postman/shopsmart.postman_collection.json -e postman/shopsmart.postman_environment.json`
- **Selenium E2E:** `pytest selenium_tests -v`
- **Locust Load Test:** `locust -f loadtest/locustfile.py --host http://localhost:3000`
- **SonarQube:** `sonar-scanner` (configured via `sonar-project.properties`)

## Documentation Index
- `docs/SRS.md` — Software Requirements Specification
- `docs/user-manual.md` — Customer & Admin User Manual
- `docs/deployment-guide.md` — Local, Docker, CI/CD & Monitoring Deployment Guide
- `docs/software-testing.md` — Testing Strategy & Suite Guide
- `docs/test-cases.md` — Test Cases & Traceability Matrix
- `docs/responsible-ai-checklist.md` — Responsible AI Chatbot Documentation
- `docs/sqa-plan.md` — Software Quality Assurance Plan
- `docs/jira-setup-guide.md` — Jira Scrum Backlog, Stories & 14 Tasks Setup Guide
- `docs/practical-execution-guide.md` — Step-by-Step Practical Execution Runbook
- `docs/evidence/` — Submission Evidence Checklist, Templates & Troubleshooting
