# 1.6 / 4.1 Test case sheet

Requirement IDs refer to `SRS_v2_corrected.md`. "Automated result" comes from the last full `pytest` run (44 passed). The manual columns are for your hands-on run (task 4.1: execute these 15 by hand first, note minutes taken, then compare with the automated run).

| TC | Requirement | Steps | Expected | Automated test | Automated result | Manual result (fill) | Manual minutes (fill) |
|---|---|---|---|---|---|---|---|
| TC01 | FR2 | Add Notebook x2 to a new cart | Total 100.00 | test_US02_customer_adds_and_removes_cart_items | PASS | | |
| TC02 | FR2, FR12 | Add 6 Pen Sets when stock is 5 | Rejected: insufficient stock | test_over_stock_rejected | PASS | | |
| TC03 | FR2 | Remove an item; open an unknown cart | Cart empty; unknown cart gives 404 | test_remove_item_and_unknown_cart | PASS | | |
| TC04 | FR3 | 10 units at 10.00 | Line total 95.00 | test_bulk_discount_at_threshold | PASS | | |
| TC05 | FR3b | Apply SAVE10 to 100.00 cart | Total 90.00 | test_coupon_flow | PASS | | |
| TC06 | FR3b | Apply code FAKE | Rejected | test_invalid_coupon | PASS | | |
| TC07 | FR4, FR5 | Checkout with valid email and tok_ok | Order PAID, total correct, stock reduced | test_full_checkout_flow | PASS | | |
| TC08 | FR4, FR5 | Checkout with tok_fail | Declined; stock unchanged; no order | test_payment_declined_keeps_stock | PASS | | |
| TC09 | FR5 | Checkout with an empty cart | Rejected | test_empty_cart_rejected | PASS | | |
| TC10 | FR4 | Checkout with email "bad" | Rejected | test_US04_checkout_requires_valid_email | PASS | | |
| TC11 | FR5 | Buy 3 Pen Sets (stock 5) | Stock becomes 2 | test_stock_decrements_after_order | PASS | | |
| TC12 | FR8 | Ask "status of order #1 <right email>" | Shows PAID/SHIPPED/... | test_order_status_with_matching_email | PASS | | |
| TC13 | FR8 | Ask with no email or wrong email | Not found message, no status shown | test_order_status_hidden_without_or_with_wrong_email | PASS | | |
| TC14 | FR7 | Ask "How long does shipping take?" | Written shipping policy | test_US07_customer_asks_chatbot_policy_question | PASS | | |
| TC15 | FR10 | Ask "Do you sell gift cards?" | Escalated to human agent | test_US08_chatbot_escalates_unknown_to_support_agent | PASS | | |

## Defects found vs missed (task 1.6)
| Defect | Description | Found by | Missed by earlier tests? |
|---|---|---|---|
| DEF-02 | Metrics shared between app instances | Integration test | No (found the first time it ran) |
| DEF-03/04/05 | Chatbot retrieval gaps and regressions | Chatbot eval (30 questions) | No |
| DEF-06 | Paraphrases answered only 50% offline | Held-out eval | Yes: the 30-question set was tuned and showed 100% |
| DEF-07, 08 | `/metrics` wrong with 2 workers; not thread-safe | Load test, code review | Yes: all 41 functional tests passed |
| DEF-09 | Checkout could oversell stock under concurrency | AI code review | Yes: no concurrent test exists |
| DEF-10, 11 | Order data and owner endpoint unprotected | AI code review | Yes: functional tests only checked the happy path |

Lesson: functional tests found logic bugs; load testing and review found concurrency, privacy and access-control bugs that the tests could not see.
