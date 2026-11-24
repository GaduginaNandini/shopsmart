# ShopSmart Test Cases & Traceability

| ID | Module | Scenario | Expected Result | Automated Test Location |
|---|---|---|---|---|
| TC-01 | Pricing | Half-up rounding of monetary values | `10.005` rounds to `10.01`; `10.004` rounds to `10.00` | `tests/pricing.test.ts` |
| TC-02 | Pricing | Bulk discount (10+ units, R1) | 10 units of INR 50.00 calculate as INR 475.00 | `tests/pricing.test.ts` |
| TC-03 | Pricing | Coupon `SAVE10` after bulk discount (R2, R3) | 10 units @ 50.00 + `SAVE10` = INR 427.50 | `tests/pricing.test.ts` |
| TC-04 | Pricing | Invalid coupon / negative quantity | Throws validation error | `tests/pricing.test.ts` |
| TC-05 | Auth | Password hashing & verification | `scrypt` verifies matching password and rejects wrong password | `tests/session.test.ts` |
| TC-06 | Auth | Session Bearer token tampering | Valid token decodes user; modified signature returns `null` | `tests/session.test.ts` |
| TC-07 | Auth API | Register, login, invalid login, `/api/auth/me` | Register returns 201 + token; invalid login returns 401; `/api/auth/me` enforces Bearer auth | `tests/api.integration.test.ts` |
| TC-08 | Products API | List, search, category filter, details, CRUD | `?q=` and `?category=` filter accurately; `/api/products/:id` returns 200 or 404; admin CRUD gated by role/token | `tests/api.integration.test.ts` |
| TC-09 | Cart API | Create, add, patch qty, remove item, coupon | Quantity updates recalculate bulk + `SAVE10` totals; `DELETE` empties item | `tests/api.integration.test.ts` |
| TC-10 | Checkout & Orders | Approved/declined checkout & order status update | `tok_fail` returns 400; `tok_ok` creates `PAID` order (201); admin updates status (`SHIPPED`); non-admin gets 403 | `tests/api.integration.test.ts` |
| TC-11 | Observability | Health & Prometheus metrics | `GET /health` -> 200; `GET /metrics` exposes `shopsmart_up` and request/error/latency metrics | `tests/api.integration.test.ts` |
| TC-12 | Chatbot | Order status privacy & offline policy fallback | Reveals order only when email matches; answers shipping policy offline | `tests/chatbot.test.ts` |
| TC-13 | Chatbot | Numeric hallucination guardrail & escalation | Escalates when LLM outputs numbers absent from `policy.md` or `ESCALATE` | `tests/chatbot.test.ts`, `tests/api.integration.test.ts` |
| TC-14 | E2E (External) | Homepage, browsing/PDP, cart updates, checkout, chat | All 6 Selenium Page Object journeys pass in headless Chrome | `selenium_tests/test_journeys.py` |
| TC-15 | API Suite (External) | End-to-end Newman request collection | All folder assertions pass using environment variables | `postman/shopsmart.postman_collection.json` |
