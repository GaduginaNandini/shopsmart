# ShopSmart — Project Evidence & Submission Guide

This folder organizes verification status, screenshot naming conventions, expected outcomes, troubleshooting steps, and recording templates for College Integrated Project P03.

> **Integrity Policy:** Never include fabricated screenshots, invented test results, fake SonarQube scores, or estimated Locust performance numbers. Record only outputs you genuinely executed.

## 1. Evidence Folder Files
- `docs/evidence/README.md` — Checklist, naming conventions, and environment status.
- `docs/evidence/actual-results-template.md` — Structured blank templates to record real command outputs and screenshot references.
- `docs/evidence/troubleshooting.md` — Common runtime and external-tool troubleshooting guide.

## 2. Verified in This Environment vs. External Execution

### Verified Locally in Current Workspace
- **PostgreSQL & Drizzle Migrations:** Schema defined (`src/db/schema.ts`), migration generated (`drizzle/0000_free_speedball.sql`), pushed to Cloud SQL PostgreSQL, 7 tables verified, 4 products seeded.
- **TypeScript, Client Bundle & Lint:** `npm run typecheck`, `npm run lint`, and `npm run build` (`esbuild` + `tsc --noEmit`) executed cleanly with 0 errors.
- **Automated Vitest + Supertest Suite:** `npm run test:coverage` executed 4 test files (`pricing`, `chatbot`, `session`, `api.integration`), passing all 24 tests and generating `coverage/lcov.info`.

### Requires External Execution (Student / Evaluator Machine)
- Docker Compose (`docker compose up --build`)
- Prometheus & Grafana monitoring stack (`docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build`)
- GitHub Actions workflow run (triggered by push/PR on GitHub)
- Jenkins pipeline execution
- Selenium browser tests (`pytest selenium_tests`)
- Postman / Newman collection run (`npx newman run ...`)
- SonarQube analysis (`sonar-scanner`)
- Locust load test (`locust -f loadtest/locustfile.py`)
- Jira board & sprint screenshots (after manually creating the `ShopSmart` project per `docs/jira-setup-guide.md`)

## 3. Evidence Collection Checklist
- [ ] Storefront homepage, category cards, and product details modal running against PostgreSQL
- [ ] Cart quantity update, `SAVE10` discount, checkout (`tok_ok` and `tok_fail`), and Order History view
- [ ] AI Chatbot policy response, order lookup response, and human escalation ticket in Admin dashboard
- [ ] `npm run typecheck`, `npm run lint`, `npm run test:coverage`, and `npm run build` terminal output
- [ ] `docker compose up --build` container startup and `/health` check
- [ ] GitHub Actions passing workflow run and Jenkins Stage View
- [ ] Jira `ShopSmart` Backlog, Active Sprint Board, and Sprint Report
- [ ] Selenium `pytest selenium_tests -v` passing output
- [ ] Newman / Postman collection test summary
- [ ] SonarQube project overview dashboard
- [ ] Prometheus Targets (`UP`) and Grafana Operations Dashboard panels
- [ ] Locust Web UI / headless summary table

## 4. Screenshot Naming Conventions
Save captured screenshots under `docs/evidence/screenshots/` (create the folder locally when capturing) using lowercase `NN_area_description.png`:

| Filename | What to Capture |
|---|---|
| `01_homepage_hero_catalogue.png` | Dark-mode hero section, category cards, and product cards |
| `02_product_details_modal.png` | Product Details modal showing gallery, stock, and quantity stepper |
| `03_cart_coupon_checkout.png` | Cart summary with `SAVE10` applied and confirmed order message |
| `04_orders_and_admin_dashboard.png` | Admin KPIs, charts, product/order tables, and escalated tickets |
| `05_ai_chatbot_reply_escalation.png` | Floating AI assistant showing policy answer and escalation |
| `06_vitest_coverage_terminal.png` | Terminal output of `npm run test:coverage` |
| `07_docker_compose_running.png` | `docker compose ps` showing `web` and `db` healthy |
| `08_github_actions_ci_green.png` | Passing workflow run on GitHub Actions |
| `09_jenkins_pipeline_stages.png` | Jenkins pipeline Stage View with all stages green |
| `10_jira_scrum_board_and_sprint.png` | Jira `ShopSmart` Scrum board / backlog / sprint completion |
| `11_selenium_pytest_pass.png` | `pytest selenium_tests -v` terminal output |
| `12_newman_api_report.png` | `npx newman run ...` summary table |
| `13_sonarqube_dashboard.png` | SonarQube project quality gate and coverage overview |
| `14_prometheus_targets_up.png` | Prometheus `/targets` page showing `shopsmart` state `UP` |
| `15_grafana_dashboard.png` | Grafana ShopSmart Operations Dashboard populated with live traffic |
| `16_locust_load_test.png` | Locust statistics tab / terminal output |

## 5. Expected Outcomes Summary
- **Health Endpoint (`GET /health`):** HTTP `200` with `{"status":"ok"}`.
- **Metrics Endpoint (`GET /metrics`):** HTTP `200` with `shopsmart_up 1`, `shopsmart_requests_total`, `shopsmart_errors_total`, `shopsmart_response_seconds_avg`, and order counters.
- **Pricing Rules:** 10+ units of an item receive 5% bulk discount; `SAVE10` applies 10% off after bulk discount; `tok_fail` returns HTTP `400` (`payment declined`).
- **Chatbot Guardrail:** Questions covered in `src/chatbot/policy.md` return grounded answers; out-of-policy questions return the escalation prompt and insert a row in `support_tickets`.
