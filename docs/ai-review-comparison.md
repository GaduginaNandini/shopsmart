# 5.3 Review of three modules: AI vs static tools vs human

AI review: Claude, prompt "Act as a security reviewer ..." (see `prompt-library.md`) on `services.py` (checkout), `chatbot/service.py` and `routes.py`. Static tools: Pylint 8.49/10 and Bandit (before fixes), radon. Human review column is for your teammates (copy into a PR review).

| # | Module | Finding | Severity | AI review | Pylint/Bandit/radon | Human review (team) | Action |
|---|---|---|---|---|---|---|---|
| 1 | routes.py | Order API open to anyone who guesses an id (data exposure) | High | Found | Not found | | Fixed (DEF-11) |
| 2 | routes.py | Product creation has no access check | High | Found | Not found | | Fixed (DEF-11) |
| 3 | chatbot/service.py | Chatbot reveals any order's status to anyone | High | Found | Not found | | Fixed (DEF-10) |
| 4 | services.py | Checkout can oversell stock under concurrency (no row lock) | High | Found | Not found | | Fixed (DEF-09) |
| 5 | __init__.py | Metrics counters not thread-safe, wrong with several workers | Medium | Found | Not found | | Fixed (DEF-07, 08) |
| 6 | services.py | Hard-coded token string flagged as password (B105) | Low | Judged false positive | Bandit flagged | | `# nosec B105` with reason |
| 7 | chatbot/service.py | Broad `except Exception` swallows LLM errors | Low | Found | Pylint W0718 | | Narrowed to request/parse errors |
| 8 | chatbot/service.py | `answer()` too complex (17) | Low | Found | radon C(17), Pylint R0911 | | Split into helpers (now A) |
| 9 | models/services | Missing docstrings (20) | Low | Not reported | Pylint C0116 x20 | | Added |
| 10 | routes.py | No CSRF/auth model for customers (carts guessable by integer id) | Medium | Found | Not found | | Open: documented as future work |
| 11 | pricing.py | Rounding and discount order | Info | No issue | No issue | | Covered by unit tests |

**Summary (this review):** of the 9 real issues (rows 1-5, 7-10), the AI review found 8 (all but the missing docstrings) and the static tools found 3 (rows 7, 8, 9, all code-quality, none security). Bandit's one finding (row 6) was a false positive. Caveat: the same AI that wrote the code reviewed it, which biases the result, so ask ChatGPT or Copilot to review the same three modules for an independent AI column. Add SonarQube results for the same modules and your human review column.
