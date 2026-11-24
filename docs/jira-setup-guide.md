# ShopSmart — Jira Setup & Agile Planning Guide

> **Submission Note:** This guide provides a complete Jira configuration blueprint for College Integrated Project P03. **No Jira issues, boards, or sprints have been created automatically in a live Atlassian Jira site**; follow the steps below when setting up your team's Jira Cloud workspace.

## 1. Project Details
- **Project Name:** ShopSmart
- **Project Key:** `SHP`
- **Project Description:** ShopSmart is a full-stack e-commerce platform built with Express, TypeScript, PostgreSQL (Drizzle ORM), Firebase Authentication, and a policy-grounded Gemini AI customer-support chatbot, supported by automated testing, Docker packaging, CI/CD pipelines, static analysis, load testing, and Prometheus/Grafana monitoring.
- **Template Recommendation:** **Scrum** (Company-managed or Team-managed Scrum software project).
  - **Why Scrum over Kanban?** College Integrated Project P03 has fixed weekly/bi-weekly submission milestones (backend & database migration, storefront & AI chatbot, automated testing & CI/CD, observability & final submission). Time-boxed 1-week or 2-week Sprints make milestone tracking, burndown charts, and Sprint Completion evidence straightforward for grading.

## 2. Workflow Stages
Configure the board columns to map directly to the following Jira workflow statuses:
1. **To Do** — Triaged backlog items ready for sprint pickup.
2. **In Progress** — Active development, test authoring, or infrastructure configuration.
3. **In Review** — Pull request opened; automated GitHub Actions (`ci.yml`) and peer review running.
4. **Testing / QA** — Verified locally via Vitest/Supertest, Selenium, or Newman against PostgreSQL.
5. **Done** — Acceptance criteria satisfied, CI green, and evidence recorded.

## 3. Product Backlog & Epics
- **EPIC-1: Core Backend & PostgreSQL Persistence** (`server.ts`, `src/db/`, `src/routes.ts`)
- **EPIC-2: Storefront UI, Cart & Checkout Experience** (`public/index.html`, `src/client/main.ts`, `src/pricing.ts`)
- **EPIC-3: Responsible AI Support Chatbot** (`src/chatbot/service.ts`, `src/chatbot/policy.md`)
- **EPIC-4: Quality Assurance, Security & Performance Testing** (`tests/`, `selenium_tests/`, `postman/`, `loadtest/`, `sonar-project.properties`)
- **EPIC-5: DevOps, Containerization & Observability** (`Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `Jenkinsfile`, `monitoring/`)

## 4. User Stories (with Acceptance Criteria)
- **US-01 (Authentication):** As a customer, I want to register and sign in using email/password or Google Sign-In so my orders are linked to my account.
  - *Acceptance Criteria:* Passwords hashed with salted `scrypt`; Bearer tokens verified server-side; `/api/auth/me` returns profile or `401` when unauthenticated.
- **US-02 (Catalogue & Product Details):** As a shopper, I want to search, filter by category, and inspect product details with stock availability before adding items to my bag.
  - *Acceptance Criteria:* `GET /api/products` filters by `q` and `category`; `GET /api/products/:id` returns product details; Product Details modal allows quantity selection.
- **US-03 (Cart & Discount Rules):** As a shopper, I want bulk quantity discounts (5% for 10+ units) and promo code `SAVE10` (10% off) calculated accurately.
  - *Acceptance Criteria:* Half-up rounding to 2 decimal places (`src/pricing.ts`); invalid coupon returns `400`.
- **US-04 (Checkout & Order History):** As a shopper, I want atomic stock verification during checkout and order tracking so I never buy out-of-stock goods.
  - *Acceptance Criteria:* `tok_fail` declines with `400`; `tok_ok` creates `PAID` order in PostgreSQL transaction; guest lookup requires email match.
- **US-05 (AI Support Chatbot):** As a shopper, I want instant answers on shipping, refunds, and order status with escalation when information is outside store policy.
  - *Acceptance Criteria:* Grounded to `src/chatbot/policy.md`; numeric guardrail prevents hallucinated dates/fees; ungrounded queries persist to `support_tickets`.
- **US-06 (Admin Operations):** As a store admin, I want to create/update/delete products, update order fulfillment statuses, and inspect escalated tickets.
  - *Acceptance Criteria:* Non-admin callers receive `403`; admin UI renders KPIs, charts, and management tables.

## 5. Task & Subtask Breakdown (14 Tasks Across Dev, Testing & Deployment)

| Key | Type | Area | Summary | Subtasks |
|---|---|---|---|---|
| `SHP-1` | Task | Development | Configure PostgreSQL schema and Drizzle migrations | 1.1 Define 7 tables in `src/db/schema.ts`<br>1.2 Generate & push SQL migration (`drizzle/`) |
| `SHP-2` | Task | Development | Implement authentication, session tokens, and Firebase sync | 2.1 Implement `scrypt` & HMAC token utilities<br>2.2 Add `/api/auth/register`, `/login`, `/firebase`, `/me`, `/claim-admin` |
| `SHP-3` | Task | Development | Build deterministic pricing engine (`R1`, `R2`, `R3`) | 3.1 Implement `money()`, `lineTotal()`, `cartTotal()`<br>3.2 Integrate pricing into cart & checkout repository methods |
| `SHP-4` | Task | Development | Implement transactional cart & checkout REST endpoints | 4.1 Add cart CRUD endpoints (`POST`, `GET`, `PATCH`, `DELETE`)<br>4.2 Add atomic stock check and mock payment (`tok_ok`/`tok_fail`) |
| `SHP-5` | Task | Development | Integrate Gemini AI support chatbot with policy fallback | 5.1 Connect `@google/genai` (`gemini-4-hydrogen`) to `policy.md`<br>5.2 Add `numbersGrounded()` check and `support_tickets` escalation |
| `SHP-6` | Task | Development | Build dark-mode storefront UI, PDP modal, and Admin dashboard | 6.1 Implement storefront, cart sidebar, and PDP modal<br>6.2 Implement Order History, Admin KPIs, and floating AI chat widget |
| `SHP-7` | Task | Testing | Write Vitest unit tests for pricing, session, and chatbot | 7.1 Add `tests/pricing.test.ts` and `tests/session.test.ts`<br>7.2 Mock repository for `tests/chatbot.test.ts` |
| `SHP-8` | Task | Testing | Implement Supertest HTTP API integration tests & coverage | 8.1 Test auth, products, cart, checkout, orders, and chat endpoints<br>8.2 Configure `@vitest/coverage-v8` LCOV output |
| `SHP-9` | Task | Testing | Automate browser E2E journeys with Selenium Page Object Model | 9.1 Build `ShopPage` POM selectors<br>9.2 Cover homepage, browsing/PDP, cart updates, checkout, and chat |
| `SHP-10` | Task | Testing | Create Postman collection & Newman CLI verification suite | 10.1 Parameterize `baseUrl`, `token`, `cartId`, `orderId`<br>10.2 Add `pm.test` assertions across all endpoints |
| `SHP-11` | Task | Testing | Configure SonarQube static analysis & Locust load tests | 11.1 Complete `sonar-project.properties` with LCOV path<br>11.2 Add `loadtest/locustfile.py` scenarios |
| `SHP-12` | Task | Deployment | Containerize app and PostgreSQL using Docker & Compose | 12.1 Write `Dockerfile` with healthcheck<br>12.2 Configure `docker-compose.yml` with `pgdata` volume |
| `SHP-13` | Task | Deployment | Configure GitHub Actions & Jenkins CI pipelines | 13.1 Author `.github/workflows/ci.yml` (`lint`, `test:coverage`, `build`)<br>13.2 Author `Jenkinsfile` multi-stage pipeline |
| `SHP-14` | Task | Deployment | Configure Prometheus metrics & Grafana operations dashboard | 14.1 Expose `/metrics` with HELP/TYPE metadata<br>14.2 Configure `prometheus.yml`, `alerts.yml`, and `shopsmart.json` |

## 6. Sprint Planning Steps
1. Open **Backlog** in Jira (`SHP`) and click **Create sprint**.
2. **Sprint 1 (Core App & AI Support):** Move `SHP-1` through `SHP-6` into Sprint 1, assign story points (e.g., 2–5 points each), set Sprint Goal (*"Deliver working full-stack ShopSmart storefront, PostgreSQL persistence, and grounded AI chatbot"*), and click **Start sprint** (duration: 1–2 weeks).
3. **Sprint 2 (Testing, CI/CD & Monitoring):** Move `SHP-7` through `SHP-14` into Sprint 2, set Sprint Goal (*"Complete automated tests, Docker, CI/CD, SonarQube, Locust, and Prometheus/Grafana setup"*), and click **Start sprint**.

## 7. Sprint Completion Steps
1. Ensure every committed issue in the active Sprint is moved to **Done** (or explicitly carried over if incomplete).
2. Click **Complete sprint** in the upper-right of the Active Sprints board.
3. Choose where any unfinished items move (next Sprint or Backlog) and review the automatically generated **Sprint Report** (Completed vs. Incomplete points and Burndown chart) for your academic submission evidence.
