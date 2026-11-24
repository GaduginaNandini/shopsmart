# AI-Usage Log

One row per prompt or AI-assisted step. Mask sensitive data (emails, keys, names) before prompting. Rows 1 to 12 were produced by Claude while building this repository; **your team must add its own rows** (ChatGPT, Copilot, Tabnine prompts and decisions) and re-verify these.

| # | Date | Member | Tool/model | Prompt (masked) | AI output (summary) | How I verified | What I corrected | Decision |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-11-23 | team | Claude | Scaffold ShopSmart Flask app, pricing, checkout, chatbot guardrail | Repo scaffold, 23 tests | Ran pytest (91% coverage); read every file | Test import path; broken index route | Modify |
| 2 | 2026-11-23 | team | Claude | Evaluate chatbot on 30 questions | Keyword retriever answered 23/30 (77%) | Ran `eval/run_chatbot_eval.py`, read each failure | Added stemming, synonyms, stronger evidence threshold, generic-word filter | Modify |
| 3 | 2026-11-23 | team | Claude | Raise retrieval accuracy | Eval went to 30/30 | Wrote 20 unseen questions (held-out) | Held-out showed 10/20 (50%): the 30/30 was tuned on the same questions; reported both | Accept with caveat |
| 4 | 2026-11-24 | team | Claude | Refactor `answer()` (complexity 17) | Split into helpers | Re-ran tests and eval | Refactor changed the sensitive-topic logic and broke question 20; restored original behaviour | Modify |
| 5 | 2026-11-24 | team | Claude | Give the LLM the whole policy; guard invented numbers | `numbers_grounded` check, full-policy context | New unit tests with stub LLM | LLM mode itself not measured (no API key) | Accept, pending measurement |
| 6 | 2026-11-24 | team | Claude | Load test with Locust | /metrics showed half the real requests under 2 workers; counters not thread-safe | Compared /metrics with Locust (986 = 986 after fix) | Single worker with threads; lock around counters | Modify |
| 7 | 2026-11-24 | team | Claude | Security review of checkout, chatbot, routes | Order privacy leak, open owner endpoint, stock oversell | Reproduced in code; added tests for each | Email must match; owner token; row lock (effective on PostgreSQL only) | Accept |
| 8 | 2026-11-24 | team | Claude | Add missing docstrings | Auto-generated one-word docstrings | Read them | Rewrote the meaningful ones for core logic | Modify |
| 9 | 2026-11-24 | team | Claude | Draft SRS v1 from client notes | SRS with vague and conflicting lines | Compared against client notes | 12 corrections recorded in SRS v2 | Modify |
| 10 | 2026-11-24 | team | Claude | Score SDLC models | Weighted totals in the table were wrong | Recomputed with a script | Totals fixed (Incremental 55, not 54) | Modify |
| 11 | 2026-11-24 | team | Claude | Summarise AI review vs tools | Miscounted findings found | Recounted rows | Fixed counts (AI 8 of 9, tools 3 of 9); added self-review bias caveat | Modify |
| 12 | 2026-11-24 | team | Claude | Describe held-out failures | Said 9 safe escalations, 1 wrong | Recomputed from the results file | 8 escalations, 1 wrong answer, 1 refund quote | Modify |
| 13 | | | | | | | | |

Not verified by anyone yet: Docker build, GitHub Actions run, Jenkins run, SonarQube, Selenium run on your machine, LLM-mode chatbot accuracy.

## Declaration (complete on Day 28)
We declare that AI tools were used as recorded in this log, that all AI output was reviewed and verified by the team, and that no sensitive data was entered into prompts.

Signed: ____________ (A) ____________ (B) ____________ (C) ____________ (D)
