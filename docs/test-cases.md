# ShopSmart Test Cases & Traceability

| ID | Module | Scenario | Expected Result | Automated Test Location |
|---|---|---|---|---|
| TC-01 | Pricing | Half-up rounding of monetary values | `10.005` rounds to `10.01`; `10.004` rounds to `10.00` | `tests/pricing.test.ts` |
| TC-02 | Pricing | Bulk discount (10+ units) | 10 units of INR 50.00 calculate as INR 475.00 | `tests/pricing.test.ts` |
| TC-03 | Pricing | Coupon `SAVE10` after bulk discount | 10 units @ 50.00 + `SAVE10` = INR 427.50 | `tests/pricing.test.ts` |
| TC-04 | Pricing | Invalid coupon / negative quantity | Throws validation error | `tests/pricing.test.ts` |
| TC-05 | Auth | Password hashing & verification | `scrypt` verifies matching password and rejects wrong password | `tests/session.test.ts` |
| TC-06 | Auth | Session Bearer token tampering | Valid token decodes user; modified signature returns `null` | `tests/session.test.ts` |
| TC-07 | Chatbot | Order status privacy | Reveals order only when email matches; hides otherwise | `tests/chatbot.test.ts` |
| TC-08 | Chatbot | Offline policy fallback | Returns shipping section from `policy.md` when LLM returns `null` | `tests/chatbot.test.ts` |
| TC-09 | Chatbot | Numeric hallucination guardrail | Escalates when LLM outputs numbers absent from `policy.md` | `tests/chatbot.test.ts` |
| TC-10 | API | Health & Prometheus metrics | `GET /health` -> 200; `GET /metrics` exposes `shopsmart_requests_total` | `tests/api.integration.test.ts` |
| TC-11 | API | Admin product creation guard | Rejects unauthenticated `POST /api/products` (403); allows valid `X-Owner-Token` (201) | `tests/api.integration.test.ts` |
| TC-12 | API | Registration, cart, declined & approved checkout | `tok_fail` returns 400; `tok_ok` creates order (201) | `tests/api.integration.test.ts` |
| TC-13 | E2E | Browser storefront & chatbot journeys | Checkout success, declined payment, and policy reply pass in Chrome | `selenium_tests/test_journeys.py` (requires Chrome + Selenium) |
