# ShopSmart Software Testing Documentation

## 1. Testing Strategy
ShopSmart applies a multi-layer testing pyramid covering business logic, HTTP contracts, browser user journeys, static quality gates, and concurrent load resilience:

1. **Unit & Security Tests (Vitest)**
   - `tests/pricing.test.ts`: Half-up currency rounding, 5% bulk discount for >=10 units (`R1`), `SAVE10` coupon (`R2`, `R3`), and invalid input guards.
   - `tests/session.test.ts`: `scrypt` password hashing/verification and HMAC Bearer token signing/tamper rejection.
   - `tests/chatbot.test.ts`: `policy.md` section parsing, order ID & email extraction, numeric grounding check, order lookup privacy, offline fallback, and hallucination/escalation handling.
2. **HTTP API Integration Tests (Vitest + Supertest)**
   - `tests/api.integration.test.ts`: Mocks `src/db/repository.ts` cleanly in memory so tests never depend on or mutate production PostgreSQL data. Covers `/health`, `/metrics`, registration/login/`/api/auth/me`, product search/filter/details/CRUD, cart CRUD + pricing + coupon, declined/approved checkout, order history & admin status updates, and `/api/chat`.
3. **End-to-End Browser Tests (Selenium WebDriver + pytest)**
   - `selenium_tests/pages/shop_page.py` (Page Object Model) & `selenium_tests/test_journeys.py`: Covers homepage loading, category browsing & Product Details modal, cart item addition/quantity increment/decrement/removal, `SAVE10` + checkout (`tok_ok` and `tok_fail`), and floating AI chat support.
4. **API Collection Automation (Postman + Newman)**
   - `postman/shopsmart.postman_collection.json` & `postman/shopsmart.postman_environment.json`: Automated request chaining (`token`, `productId`, `cartId`, `orderId`) with Chai assertions.
5. **Static Code Analysis & Coverage (SonarQube + `@vitest/coverage-v8`)**
   - `vitest.config.ts` generates `coverage/lcov.info`; `sonar-project.properties` configures source paths, test paths, exclusions, and LCOV import.
6. **Load & Concurrency Testing (Locust)**
   - `loadtest/locustfile.py`: Simulates concurrent shoppers browsing homepage, product listings, product details, cart mutations, and `/health`.

## 2. Running Automated Tests Locally
```bash
# Run unit & API integration tests
npm test

# Run tests and generate coverage/lcov.info
npm run test:coverage

# TypeScript & lint verification
npm run typecheck
npm run lint
```

## 3. Running External Test Suites
- **Selenium E2E** (with app running at `http://localhost:3000`):
  ```bash
  pip install selenium pytest
  pytest selenium_tests -v
  ```
- **Newman API Suite**:
  ```bash
  npx newman run postman/shopsmart.postman_collection.json -e postman/shopsmart.postman_environment.json
  ```
- **Locust Load Test**:
  ```bash
  pip install locust
  locust -f loadtest/locustfile.py --host http://localhost:3000
  ```
- **SonarQube Scan**:
  ```bash
  npm run test:coverage
  sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.token=<YOUR_SONAR_TOKEN>
  ```
