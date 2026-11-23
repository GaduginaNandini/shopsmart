# ShopSmart SRS — v2 (corrected)

Version 2.0 · 2026-11-24 · Owner: Product Owner · Source: SRS v1 (AI draft) corrected by hand against the client notes.

## 1. Purpose and scope
ShopSmart lets customers browse products, fill a cart and check out (payment is mocked), and ask a support chatbot about order status and written policies. Out of scope: real payment processing, shipping integration, customer accounts, multi-currency.

**Users:** Customer, Shop Owner, Support Agent.

## 2. Functional requirements
| ID | Requirement (testable) | Test |
|---|---|---|
| FR1 | The catalogue lists every product with name, price (INR) and stock. | test_US01 |
| FR2 | A customer can add a product to a cart, change quantity and remove it. Quantity must be >= 1 and cannot exceed stock. | test_US02, test_over_stock_rejected |
| FR3 | Bulk discount: 10 or more units of one product give 5% off that line. | test_pricing |
| FR3b | Coupon SAVE10 gives 10% off the cart subtotal after bulk discount; other codes are rejected. Money is rounded half-up to 2 decimals. | test_coupon_* |
| FR4 | Checkout needs a valid email and a card token. The mock gateway declines token `tok_fail` and approves any other token. No real card data is processed or stored. | test_US03, test_US04 |
| FR5 | A successful checkout creates an order with status PAID, reduces stock by the purchased quantity and empties the cart. A failed payment changes nothing. | test_full_checkout_flow, test_payment_declined_keeps_stock |
| FR6 | The owner can create products (name, non-negative price, stock) using an owner token. Without the token the request is rejected with 403. | test_US05, test_US05b |
| FR7 | The chatbot answers ONLY from (a) the order database and (b) the written policy file. | test_chatbot, eval |
| FR8 | Order status is given only when the customer supplies the order number AND the email used at checkout. An unknown order and a wrong email get the same reply. | test_US10 |
| FR9 | Refund answers quote the written policy (refund within 7 days of delivery, unused items, paid back in 5 to 7 business days). The bot never states a rule that is not in the policy. | test_US09, numbers_grounded |
| FR10 | If the policy does not cover the question, or the LLM answer contains a number that is not in the policy, the bot hands over to a human support agent. | test_US08 |
| FR11 | Escalated questions are answered by a human support agent by email within 1 business day (handled outside the software in v1.0). | manual |
| FR12 | A checkout is rejected when any line exceeds stock; stock rows are locked during checkout. | test_over_stock_rejected |

## 3. Non-functional requirements
| ID | Requirement | Measure |
|---|---|---|
| NFR1 | Response time: 95% of API calls under 200 ms at 20 concurrent users on the demo machine. | Locust |
| NFR2 | A first-time user can add an item and check out in under 2 minutes without help. | Usability test with 5 users (team to run) |
| NFR3 | No high-severity findings from Bandit; no secrets in the repository; owner and order data protected as in FR6 and FR8. | Bandit, review |
| NFR4 | The container exposes /health and /metrics. 24/7 availability is out of scope for a course project. | Prometheus |
| NFR5 | Card details are never stored. | Code review |
| NFR6 | Unit and integration coverage of at least 80%. | pytest-cov |
| NFR7 | Chatbot answers at least 85% of the 30-question test set correctly. | eval/run_chatbot_eval.py |

## 4. Constraints and assumptions
Python/Flask, PostgreSQL, Gemini LLM API, Docker, GitHub Actions. Payment is mocked. Policy text is in `app/chatbot/policy.md`; policy changes are made there, never in code or prompts.

## 5. Correction log (v1 -> v2)
| # | Type | v1 text | Problem | v2 fix |
|---|---|---|---|---|
| 1 | Ambiguous | "fast, user-friendly" | Not measurable | NFR1 and NFR2 with numbers |
| 2 | Ambiguous | FR3 "discounts for large orders" | "large" and "discount" undefined | FR3: 10 units, 5%; FR3b coupon rules |
| 3 | Conflicting | FR9 refunds within 30 days vs constraints 7 days | Two different refund windows | One rule from the written policy: 7 days after delivery |
| 4 | Conflicting | FR4 "all popular payment methods" vs "payment is mocked" | Cannot support both | FR4: mocked gateway, card token only |
| 5 | Conflicting | NFR5 "store payment details" vs NFR3 "secure" | Storing card data is unsafe and out of scope | NFR5: card details are never stored |
| 6 | Missing | FR5 order confirmation email | Not in scope (no email service) | Removed; order id shown on screen |
| 7 | Ambiguous | FR7 "all questions quickly and accurately" | Impossible to verify; invites invented answers | FR7: only from DB and written policy; NFR7 85% target |
| 8 | Missing | Chatbot privacy | Anyone could read any order | FR8: order number plus email |
| 9 | Missing | Owner access control | Anyone could edit products | FR6: owner token |
| 10 | Ambiguous | FR11 "take over when needed" | No trigger defined | FR10: escalate when not grounded; FR11 response time |
| 11 | Missing | Stock rules | Overselling not covered precisely | FR2 and FR12 |
| 12 | Ambiguous | NFR4 "available 24/7" | Unrealistic for scope | NFR4: health and metrics only |
