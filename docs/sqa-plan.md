# 5.1 SQA plan and quality scorecard (one page)

**Scope:** ShopSmart v1.0 (catalogue, cart, checkout with mocked payment, chatbot). **Owner:** QA lead (rotate). **Standards:** Definition of Done in `agile.md`.

## Activities
| Activity | When | Tool | Gate |
|---|---|---|---|
| Static analysis | every push | Pylint, Bandit, radon (SonarQube before release) | Pylint >= 9/10 (CI), no high Bandit findings |
| Unit + integration tests | every push | pytest, pytest-cov | all pass, coverage >= 80% |
| Browser tests | each sprint | Selenium page-objects | all journeys pass |
| Chatbot evaluation | every chatbot change | `eval/run_chatbot_eval.py` | >= 85% on 30 questions; no invented policy |
| Load check | before release | Locust | 0 server errors, p95 under 200 ms |
| Reviews | every PR | one human reviewer + AI review | PR template checklist |
| Defect tracking | continuous | `docs/defect-register.csv` | open high defects reviewed at retrospective |

## Scorecard (0-5; scores computed by `tools/sqa_radar.py`; target 4.0)
| Attribute | Metric | Measured | Formula | Score |
|---|---|---|---|---|
| Correctness | Test pass rate; chatbot accuracy on held-out 20 questions | 44/44 tests; held-out 10/20 | 5 x (0.5 x pass rate + 0.5 x held-out accuracy) | **3.75** |
| Reliability | Server error rate under load; share of logged defects fixed | 0 of 986 requests were 5xx; 10 of 11 defects fixed | 5 x (0.5 x (1 - error rate) + 0.5 x fixed share) | **4.77** |
| Maintainability | Pylint score; test coverage | 10.00/10; 93%; average complexity A (2.7); maintainability index A everywhere | 5 x (0.5 x pylint/10 + 0.5 x coverage) | **4.83** |
| Usability* | Automated browser journeys passing | 9/9 | 5 x pass rate | **5.0*** |
| Efficiency | p95 latency vs 200 ms target (Locust, 20 users, 33 req/s, demo laptop, SQLite) | 11 ms | 5 x min(1, 200 / p95) | **5.0** |

*Usability is only a proxy (functional journeys). Run a 5-user test (time to first checkout, SUS questionnaire in Google Forms) and replace this row.

Chart: `docs/screenshots/sqa_radar.png`. Interpretation: correctness is the weak spot because the keyword fallback answers only half of unseen paraphrased questions (safe escalation, not wrong answers). Measure the LLM mode with `GEMINI_API_KEY` set and update the score. The dev-set score of 30/30 is optimistic because the retriever was tuned on those questions.
