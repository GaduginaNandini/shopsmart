# ShopSmart Practical Execution Guide (College Submission P03)

Use this step-by-step runbook during lab evaluation or final viva to execute each required tool and capture evidence in `docs/evidence/actual-results-template.md`.

---

## Practical 1: Local Application & PostgreSQL Verification
```bash
cp .env.example .env
# Populate SQL_HOST, SQL_PORT, SQL_DB_NAME, SQL_USER, SQL_PASSWORD, SQL_ADMIN_USER, SQL_ADMIN_PASSWORD
npm install
npx drizzle-kit push --config=src/db/drizzle.config.ts
npm run build
npm run dev
```
Verify in another terminal:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/products
```

## Practical 2: TypeScript, Lint, Automated Tests & Coverage
```bash
npm run typecheck
npm run lint
npm run test:coverage
npm run build
```
- **Outputs:** Console test summary + LCOV coverage report at `coverage/lcov.info`.

## Practical 3: Docker & Docker Compose
```bash
docker compose up --build -d
docker compose ps
curl http://localhost:3000/health
```
- Confirm both `db` (`postgres:16`) and `web` (`node:22-slim`) report `healthy`.
- Stop when finished: `docker compose down`.

## Practical 4: Prometheus & Grafana Monitoring
```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build -d
```
- Generate sample traffic:
  ```bash
  curl http://localhost:3000/api/products
  curl http://localhost:3000/metrics
  ```
- Open **Prometheus:** `http://localhost:9090/targets` -> verify `shopsmart` (`web:3000`) is `UP`.
- Open **Grafana:** `http://localhost:3001` (`admin` / `admin`) -> open **ShopSmart Operations Dashboard** and inspect Availability, Request Count/Rate, Request Duration, Error Rate, and Order panels.

## Practical 5: Postman & Newman API Suite
Ensure the app is running at `http://localhost:3000`, then run:
```bash
npx newman run postman/shopsmart.postman_collection.json \
  -e postman/shopsmart.postman_environment.json
```
- Inspect the summary table showing executed requests and passed assertions across Health, Auth, Products, Cart, Checkout, Orders, and Chatbot.

## Practical 6: Selenium Browser Automation
Ensure Google Chrome is installed and ShopSmart is running at `http://localhost:3000`:
```bash
pip install selenium pytest
pytest selenium_tests -v
```
- Runs 6 Page Object Model browser tests covering homepage load, category browsing & Product Details modal, cart quantity updates/removal, checkout (`tok_ok` & `tok_fail`), and chatbot replies.

## Practical 7: SonarQube Static Code Analysis
1. Start a local SonarQube instance (e.g., `docker run -d --name sonarqube -p 9000:9000 sonarqube:lts-community`).
2. Generate fresh coverage first:
   ```bash
   npm run test:coverage
   ```
3. Run `sonar-scanner` using `sonar-project.properties`:
   ```bash
   sonar-scanner \
     -Dsonar.host.url=http://localhost:9000 \
     -Dsonar.token=<YOUR_SONAR_TOKEN>
   ```
4. Open `http://localhost:9000/dashboard?id=shopsmart` and record actual observed metrics.

## Practical 8: Locust Load Testing
Ensure ShopSmart is running at `http://localhost:3000`:
```bash
pip install locust
# Interactive Web UI (http://localhost:8089):
locust -f loadtest/locustfile.py --host http://localhost:3000

# Or short headless run (10 users, spawn rate 2/s, 30 seconds):
locust -f loadtest/locustfile.py --host http://localhost:3000 --headless -u 10 -r 2 -t 30s
```

## Practical 9: GitHub Actions & Jenkins CI/CD
- **GitHub Actions:** Push to `main`/`master` or open a Pull Request to trigger `.github/workflows/ci.yml`. View logs and step summary in the repository's **Actions** tab.
- **Jenkins:** Configure NodeJS tool `Node22`, create a Pipeline job pointing to `Jenkinsfile` in the Git repository, and run **Build Now**.

## Practical 10: Jira Scrum Setup
Follow `docs/jira-setup-guide.md` to create project `ShopSmart` (`SHP`), populate the 14 backlog tasks, start Sprint 1 / Sprint 2, transition tasks across workflow columns, and export the Sprint Report after completion.
