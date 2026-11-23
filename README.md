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
| GET/POST | /api/products | list / create product |
| POST | /api/cart | new cart |
| POST | /api/cart/{id}/items | add item `{product_id, quantity}` |
| POST | /api/cart/{id}/coupon | apply `{code}` (SAVE10) |
| POST | /api/cart/{id}/checkout | `{email, card_token}`; token `tok_fail` is declined |
| GET | /api/orders/{id} | order status |
| POST | /api/chat | `{message}` -> `{answer, source, escalated}` |
| GET | /health, /metrics | health and Prometheus-style metrics |

## Responsible AI rule
The chatbot never invents policy. It answers only from `app/chatbot/policy.md` and order data; otherwise it
escalates to a human. See `docs/ai-usage-log.md` and `docs/evidence/`.

## Repo layout
`app/` code · `tests/` pytest · `docs/` checklist, AI log, evidence templates · `.github/workflows/ci.yml`

## Success metrics
| Metric | Target | Current |
|---|---|---|
| Checkout success in tests | 100% | fill |
| Chatbot correct on 30 questions | 85% | fill |
| Coverage | 80% | 91% (day 1) |
| Pipeline | green | fill |
