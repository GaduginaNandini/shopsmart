# ShopSmart — E-Commerce Platform with AI Support Chatbot

![CI](https://github.com/<your-org>/shopsmart/actions/workflows/ci.yml/badge.svg)

Small online shops lose customers when queries go unanswered. ShopSmart offers a catalogue, cart and checkout
(mocked payment) plus a support chatbot that answers order-status and policy questions, grounded in a written policy.

**Users:** customer, shop owner, support agent. **Course:** AI in Software Engineering, Project P03.
**Team:** <names> | **Guide:** <name> | **College:** <name>

## Architecture
```
Browser (HTML/JS) --> Flask app --+--> catalogue / cart / order modules --> PostgreSQL
                                  +--> chatbot service --> order lookup + policy.md retrieval --> LLM (Gemini)
                                                         \--> escalate to human when not grounded
```

## Quick start (clean machine)
Requires Python 3.10+ and (optionally) Docker.
```bash
git clone <repo-url> shopsmart && cd shopsmart
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
pytest --cov=app                                        # run tests
flask --app wsgi run                                    # http://127.0.0.1:5000
```
Docker (PostgreSQL + app):
```bash
export GEMINI_API_KEY=<optional>    # without a key the chatbot answers from policy text only
docker compose up --build           # http://localhost:8000
```

## API
| Method | Path | Purpose |
|---|---|---|
| GET | /api/products | list products |
| POST | /api/products | create product; header `X-Owner-Token` (env `OWNER_TOKEN`, dev default `owner-dev-token`) |
| POST | /api/cart | new cart |
| POST | /api/cart/{id}/items | add item `{product_id, quantity}` |
| POST | /api/cart/{id}/coupon | apply `{code}` (SAVE10) |
| POST | /api/cart/{id}/checkout | `{email, card_token}`; token `tok_fail` is declined |
| GET | /api/orders/{id}?email=... | order status; email must match the order |
| POST | /api/chat | `{message}` -> `{answer, source, escalated}`; order status needs `order #N you@example.com` |
| GET | /health, /metrics | health and Prometheus-style metrics |

## Responsible AI rule
The chatbot never invents policy. It answers only from `app/chatbot/policy.md` and order data; otherwise it
escalates to a human. See `docs/ai-usage-log.md` and `docs/evidence/`.

## Results against success metrics (measured 2026-11-24)
| Metric | Target | Result |
|---|---|---|
| Checkout success in tests | 100% | 100% (all checkout tests and 9/9 browser journeys pass) |
| Chatbot correct on 30 questions | 85% | 30/30 (100%) offline, but tuned on that set; **held-out 20 unseen questions: 10/20 (50%)**. LLM mode not yet measured: set `GEMINI_API_KEY` and run `python eval/run_chatbot_eval.py --llm` |
| Coverage | 80% | 93% (44 tests) |
| Pipeline green | green | Workflow written; goes green on first push to GitHub (not yet run) |
| Load | 0 server errors | 986 requests, 0 server errors, p95 11 ms |

## Deliverables
`docs/ShopSmart_Presentation.pptx` (12 slides) · report (Claude Doc, export to Word/PDF) · `docs/demo/shopsmart_demo.mp4` · `docs/evidence/README.md` (status of every task) · `TODO_BEFORE_SUBMISSION.md`

## Verification commands
```bash
pytest --cov=app                               # unit, integration, acceptance
python eval/run_chatbot_eval.py                # 30-question chatbot eval
python eval/run_chatbot_eval.py --heldout      # 20 unseen questions
pytest selenium_tests                          # browser journeys (needs Chrome; webdriver-manager fetches the driver)
locust -f loadtest/locustfile.py --host http://localhost:8000 --headless -u 20 -r 10 -t 30s
pylint app && bandit -r app && radon cc app -a
python tools/defect_risk.py                    # defect-risk ranking
```

## Repo layout
`app/` code · `tests/` pytest · `selenium_tests/` page-object browser tests · `eval/` chatbot evaluation · `loadtest/` Locust ·
`monitoring/` Prometheus + Grafana · `docs/` SRS, diagrams, plans, evidence, checklist · `Jenkinsfile` · `.github/workflows/ci.yml`
