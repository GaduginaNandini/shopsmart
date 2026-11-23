# 1.1 SDLC process models for ShopSmart

## One paragraph per model
**Waterfall.** The team would finish the whole SRS, then design all modules, code catalogue, cart, checkout and chatbot, and only then test and deploy. With 28 days and four students, an error in a requirement (for example the conflicting refund windows found in SRS v1) would surface at the end, when there is no time left to fix it. The chatbot, whose behaviour is hard to predict, would be tested last.

**Incremental.** The product is built in three one-week slices, each ending in a working, tested release: (1) catalogue and cart, (2) checkout with mocked payment and orders, (3) support chatbot with guardrails, monitoring and CI/CD. Every increment is deployable, and feedback from one slice improves the next. This fits the fixed 28-day schedule and lets the team split work in parallel.

**Spiral.** Each loop would start with risk analysis (LLM wrong answers, refund policy, payment failures), then prototype and review. It handles the chatbot risk well, but the formal risk-review overhead and cost estimation per loop is heavy for a four-person, four-week project.

**Prototype.** A quick clickable shop and chatbot would be built first and thrown away or evolved. It helps clarify requirements, but we already have clear requirements from the brief, and prototypes risk becoming untested production code.

**V-Model.** Each development stage is paired with a test stage: requirements with acceptance tests, design with integration tests, code with unit tests. This matches the course's emphasis on testing and traceability (each SRS requirement maps to a test), but a strict V is sequential like Waterfall and has the same late-feedback problem.

## Comparison
| Criterion (weight) | Waterfall | Incremental | Spiral | Prototype | V-Model |
|---|---|---|---|---|---|
| Fits 28-day fixed deadline (3) | 2 | 5 | 2 | 4 | 3 |
| Early feedback on requirements (3) | 1 | 4 | 5 | 5 | 2 |
| Handles chatbot/LLM uncertainty (3) | 1 | 4 | 5 | 4 | 2 |
| Testing and traceability (2) | 3 | 4 | 3 | 2 | 5 |
| Low overhead for 4 students (2) | 4 | 4 | 1 | 4 | 3 |
| **Weighted total (out of 65)** | 26 | **55** | 44 | 51 | 37 |

## Decision
**Incremental delivery, with V-Model style test planning inside each increment** (every requirement gets a test ID, as in SRS v2). Compared with a pure V-Model, Incremental gives a working release every week and room to fix the defects that testing finds, which the V-Model schedules too late for a 28-day project. (Scores are the team's judgement; adjust them if you disagree and re-total.)

## Mapping to Phases 2-5
| Increment | Contents | Phase 2 (Agile planning) | Phase 3 (Dev and deploy) | Phase 4 (Testing) | Phase 5 (QA and ethics) |
|---|---|---|---|---|---|
| 1 (Sprint 1) | Catalogue, cart, pricing rules | Stories US01, US02, US11; Sprint 1 | Cart code, Docker, CI | Unit tests for price, discount, stock | Sonar baseline |
| 2 (Sprint 2) | Checkout, mock payment, orders | Stories US03 to US06; Sprint 2 | Branches, PRs, Jenkins | Integration tests, Selenium journey | Security hotspots in checkout |
| 3 (Sprint 3) | Chatbot, guardrails, monitoring | Stories US07 to US10, US12; Sprint 3 | Prompt library, chatbot code | Chatbot eval, prioritised tests | Responsible-AI checklist, SQA plan |
