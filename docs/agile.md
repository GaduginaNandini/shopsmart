# Phase 2 — Agile planning for ShopSmart

## 2.1 Agile manifesto mapping
| # | Value / principle | ShopSmart practice |
|---|---|---|
| V1 | Individuals and interactions over processes and tools | 15-minute daily stand-up; pair programming on discount rules; tools (Jira) serve the team, not the reverse |
| V2 | Working software over comprehensive documentation | Every sprint ends with a runnable increment (`docker compose up`); docs are short and live in the repo |
| V3 | Customer collaboration over contract negotiation | Shop owner (Product Owner role) reviews each sprint demo and re-orders the backlog |
| V4 | Responding to change over following a plan | Backlog re-prioritised each planning; SRS v2 changed after defects (privacy fix, owner token) |
| P1 | Satisfy the customer through early, continuous delivery | Three weekly increments: cart, checkout, chatbot |
| P2 | Welcome changing requirements | Refund-window conflict resolved by changing the SRS, not defending v1 |
| P3 | Deliver working software frequently | One-week sprints; CI builds every push |
| P4 | Business and developers work together daily | Product Owner attends stand-ups and answers policy questions |
| P5 | Build around motivated individuals | Rotating Scrum Master; each member owns one area (backend, chatbot, QA, docs) |
| P6 | Face-to-face conversation is the best communication | Stand-ups and review in person or on video; chat only for links |
| P7 | Working software is the primary measure of progress | Burndown counts only stories meeting the Definition of Done |
| P8 | Sustainable pace | Sprint load capped at team velocity; no weekend-only crunch before demos |
| P9 | Continuous attention to technical excellence | Pylint 10/10 gate, 80% coverage gate, code review on every PR |
| P10 | Simplicity: maximise work not done | Payment mocked; no accounts, no email service (see SRS scope) |
| P11 | Self-organising teams | Developers pick stories from the sprint backlog |
| P12 | Regular reflection and adjustment | Retrospective every sprint; actions recorded in meeting notes |

## 2.2 Roles
| Role | Responsibilities | Sprint 1 | Sprint 2 | Sprint 3 |
|---|---|---|---|---|
| Product Owner | Owns backlog order and acceptance; answers policy questions; accepts stories at review | Member A | Member A | Member A |
| Scrum Master | Runs ceremonies; removes blockers; protects sprint scope; keeps burndown | Member B | Member C | Member D |
| Dev Team | Estimate, build, test and demo the increment; keep Definition of Done | C, D, (B) | B, D, (C) | B, C, (D) |

(Replace A to D with names. Rotation keeps every member as Scrum Master once.)

## 2.4 Product backlog, sprint plan, Definition of Done
| Sprint | Story | Notes |
|---|---|---|
| 1 (Days 7-8 plan, week 1) | US01 browse, US02 cart, US11 coupon + pricing rules | Pair programming on discount rules (XP) |
| 2 | US03 checkout, US04 email validation, US05/US06 owner products, US10 privacy | Mock payment; integration tests |
| 3 | US07 chatbot policy, US08 escalation, US09 no invented refunds, US12 Kanban support tickets | Prompt library and eval |

Course note: task 2.3 asks for two one-week sprints with full ceremonies. Run Sprints 1 and 2 with full notes; Sprint 3 overlaps Phase 3 and 4 work.

**Definition of Done**
- [ ] Code reviewed in a pull request by one other member
- [ ] Unit tests written (test-first for cart and checkout) and passing; coverage stays at or above 80%
- [ ] Pylint at least 9/10 and Bandit shows no high findings
- [ ] Acceptance criteria of the story verified (an acceptance test exists)
- [ ] Runs in Docker; CI is green
- [ ] Docs and AI-usage log updated; no secrets or real personal data in the repo or in prompts
- [ ] Product Owner accepted it at sprint review

## 2.5 XP, Lean, Kanban
**XP:** pair programming for discount rules (driver/navigator swap every 20 minutes); test-first for cart and checkout (write the failing test in `tests/`, then code). **Lean 7 wastes in ShopSmart:**
| Waste | Example in this project | Countermeasure |
|---|---|---|
| Partially done work | Half-built stories at sprint end | Limit work in progress; finish before starting |
| Extra features | Customer accounts, real payments | SRS scope section; reject during planning |
| Relearning | Re-reading code nobody documented | Short README and docstrings |
| Hand-offs | Waiting for review | PR template; review within 24 hours |
| Delays | Waiting for API key or CI | Request keys on Day 1 |
| Task switching | Members on three stories at once | WIP limit of 2 per person |
| Defects | Chatbot invented answers, metrics bug | Eval set, guardrails, tests in CI |

**Kanban for support tickets:** columns To do, In progress (WIP 3), Waiting for customer (WIP 3), Done. Every escalated chatbot question becomes a ticket; target: first reply within 1 business day.

**Before/after observations (team to fill from your own sprints):**
| Practice | Before (what happened) | After (what changed) | Did it help? |
|---|---|---|---|
| Pair programming (discount rules) | | | |
| Test-first (cart/checkout) | | | |
| WIP limits (support board) | | | |

## 2.6 AI estimates (Claude) — compare with your planning poker
Story points on the Fibonacci scale, 1 point is roughly half a day for one student.

| Story | AI points | Team poker (fill) | Actual days (fill) | Gap |
|---|---|---|---|---|
| US01 Browse catalogue | 2 | | | |
| US02 Cart add/remove, stock checks | 5 | | | |
| US11 Coupon + bulk pricing | 3 | | | |
| US03 Checkout + mock payment | 8 | | | |
| US04 Email validation | 1 | | | |
| US05/US06 Owner products | 3 | | | |
| US10 Privacy of orders | 3 | | | |
| US07 Chatbot policy answers | 8 | | | |
| US08 Escalation | 3 | | | |
| US09 No invented refunds | 5 | | | |
| US12 Support Kanban board | 2 | | | |

AI sprint plan: Sprint 1 = US01, US02, US11 (10 points); Sprint 2 = US03, US04, US05/06, US10 (15 points); Sprint 3 = US07, US08, US09, US12 (18 points). Sprint 3 is heavy; move US12 to Sprint 2 if velocity is below 15.

## 2.3 / 2.7 / 2.8 — your evidence (cannot be written for you)
- Meeting notes for planning, stand-ups, review, retrospective: use `docs/templates/meeting-notes.md` after each event.
- Jira screenshots (backlog, sprint board, burndown, AI features) and tool ratings: take them in your Jira project.
- One-page evaluation of AI in Agile: use your own estimate gap, time saved and ratings from the tables above.
