# 3.2 Prompt library (role, context, examples, constraints)

Prompts live in code (`app/chatbot/service.py` `SYSTEM_PROMPT`) and the three tested variants in `eval/prompt_variants.py`.

## Chatbot answer prompts
| Variant | Role | Context | Examples | Constraints |
|---|---|---|---|---|
| A strict-role (shipped) | "ShopSmart's support assistant" | Entire `policy.md` | none | Answer ONLY from context; reply `ESCALATE` if missing; never invent policies, prices, dates or refund terms; never ask for card numbers; under 80 words |
| B few-shot | same as A | same | 3 Q/A pairs incl. two `ESCALATE` cases | same as A |
| C minimal | none | same | none | "If unsure say ESCALATE" |

**Run and rate:** `GEMINI_API_KEY=... python eval/prompt_variants.py` prints the table below. Paste the output and add your 1-5 rating (weigh invented answers most).

| Variant | Correct | Accuracy | Escalated | Answered when it should escalate | Rating (1-5) |
|---|---|---|---|---|---|
| A strict-role | (run) | | | | |
| B few-shot | (run) | | | | |
| C minimal | (run) | | | | |

Independent of the prompt, two code guardrails apply: any number in the LLM answer must appear in the policy (`numbers_grounded`), and any `ESCALATE` becomes the hand-over message.

## Code-generation prompt templates
1. *Pricing rule:* "You are a senior Python developer. Context: Flask app, `app/pricing.py` uses Decimal with half-up rounding. Task: add rule <rule>. Constraints: pure function, no globals, type-safe for Decimal, write pytest tests first. Output only the diff."
2. *Endpoint:* "Role: backend dev. Context: blueprint in `app/routes.py`, services in `app/services.py`. Task: add <endpoint>. Constraints: validate input, return JSON errors with 400, no secrets, no raw SQL, add tests."
3. *Review:* "Act as a security reviewer. Review this module for injection, access control, data exposure and race conditions. List findings with line numbers and severity. Do not rewrite the code."
4. *Test generation:* "From these requirements (paste SRS rows) generate pytest cases with boundary values and negative cases. Mark which requirement each covers."

## Prompt hygiene
Mask emails, names, keys and order data before pasting into any AI tool; log every prompt in `docs/ai-usage-log.md`.
