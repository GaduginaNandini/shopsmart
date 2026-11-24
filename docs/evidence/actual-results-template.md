# Actual Results Recording Template

Fill in each section **only after running the corresponding command on your machine**. Do not estimate or fabricate metrics.

- **Student / Team Name:** `<fill in>`
- **Submission Date:** `<YYYY-MM-DD>`
- **Target Branch / Commit Hash:** `<git rev-parse --short HEAD>`

---

## 1. Local Typecheck, Lint, Build & Vitest Coverage
- **Commands Executed:**
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:coverage`
  - `npm run build`
- **Execution Date/Time:** `<timestamp>`
- **Pass/Fail Status:** `<PASS / FAIL>`
- **Observed Test Count:** `<e.g., 4 files, 24 tests>`
- **Observed Coverage Summary (from `vitest --coverage`):**
  - Statements: `<__%>` | Branches: `<__%>` | Functions: `<__%>` | Lines: `<__%>`
- **Screenshot Reference:** `docs/evidence/screenshots/06_vitest_coverage_terminal.png`

---

## 2. Docker & Docker Compose
- **Command Executed:** `docker compose up --build -d && docker compose ps`
- **Execution Date/Time:** `<timestamp>`
- **Container Status:** `db`: `<healthy/unhealthy>` | `web`: `<healthy/unhealthy>`
- **`curl http://localhost:3000/health` Output:** `<paste output>`
- **Screenshot Reference:** `docs/evidence/screenshots/07_docker_compose_running.png`

---

## 3. GitHub Actions & Jenkins CI/CD
- **GitHub Actions Workflow URL / Run ID:** `<url>`
- **GitHub Actions Outcome:** `<SUCCESS / FAILURE>`
- **Jenkins Build Number & Outcome:** `<#N — SUCCESS / FAILURE>`
- **Screenshot References:** `08_github_actions_ci_green.png`, `09_jenkins_pipeline_stages.png`

---

## 4. Selenium Browser Tests
- **Command Executed:** `pytest selenium_tests -v`
- **Browser / ChromeDriver Version:** `<version>`
- **Tests Passed / Total:** `<__ / 6>`
- **Screenshot Reference:** `docs/evidence/screenshots/11_selenium_pytest_pass.png`

---

## 5. Postman / Newman API Run
- **Command Executed:** `npx newman run postman/shopsmart.postman_collection.json -e postman/shopsmart.postman_environment.json`
- **Iterations / Requests / Assertions Passed:** `<copy Newman summary>`
- **Screenshot Reference:** `docs/evidence/screenshots/12_newman_api_report.png`

---

## 6. SonarQube Static Analysis
- **Command Executed:** `sonar-scanner`
- **Quality Gate Status:** `<PASSED / FAILED>`
- **Observed Metrics:** Bugs: `<_>` | Vulnerabilities: `<_>` | Code Smells: `<_>` | Coverage: `<__%>` | Duplications: `<__%>`
- **Screenshot Reference:** `docs/evidence/screenshots/13_sonarqube_dashboard.png`

---

## 7. Prometheus & Grafana Monitoring
- **Command Executed:** `docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build -d`
- **Prometheus Target State (`http://localhost:9090/targets`):** `<UP / DOWN>`
- **Grafana URL (`http://localhost:3001`):** `<accessible yes/no>`
- **Screenshot References:** `14_prometheus_targets_up.png`, `15_grafana_dashboard.png`

---

## 8. Locust Load Test
- **Command Executed:** `locust -f loadtest/locustfile.py --host http://localhost:3000 --headless -u 10 -r 2 -t 30s`
- **Total Requests / Failures:** `<_ / _>`
- **Median / 95th Percentile Response Time (ms):** `<_ ms / _ ms>`
- **Requests/sec (RPS):** `<_>`
- **Screenshot Reference:** `docs/evidence/screenshots/16_locust_load_test.png`
