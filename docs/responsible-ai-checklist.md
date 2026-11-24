# Responsible AI Documentation & Checklist — ShopSmart Support Chatbot

## 1. Design Principles & Safeguards
ShopSmart's customer-support chatbot (`src/chatbot/service.ts`) is engineered with strict policy grounding, deterministic verification, and human-in-the-loop escalation to minimize hallucination and privacy risks:

- [x] **Grounded Policy Only:** The system prompt constrains Gemini (`gemini-4-hydrogen` via `@google/genai`) strictly to `src/chatbot/policy.md` and instructs it to output `ESCALATE` whenever an answer cannot be verified from policy text.
- [x] **Numeric Hallucination Guardrail:** `numbersGrounded()` verifies that every numeric literal (days, amounts, percentages, thresholds) in a generated LLM response exists in the reference policy before returning the reply to a user. Ungrounded replies are discarded and escalated.
- [x] **Deterministic Offline Fallback:** If `GEMINI_API_KEY` is absent or the model API fails, `retrieve()` selects matching sections from `src/chatbot/policy.md`. Sensitive topics (`refund`, `compensation`, `chargeback`, `legal`) require title-level keyword overlap or automatically escalate.
- [x] **Order Privacy Enforcement:** Order lookups (`order #N`) require either an authenticated session matching the order owner or an explicit matching customer email address (`findEmail()`). Mismatched emails receive a generic non-disclosing response.
- [x] **Human Escalation Persistence:** Escalated questions are persisted to PostgreSQL (`support_tickets`) so human administrators can inspect and resolve them in the Admin Dashboard.
- [x] **Server-Side Key Isolation:** `GEMINI_API_KEY` is read exclusively on the Node.js backend (`src/chatbot/service.ts`) and is never included in client bundles (`public/assets/app.js`).

## 2. Known Limitations & Operational Controls
- **Scope Boundary:** The chatbot answers only written store policies and explicit order status checks; it does not modify orders, issue refunds, or alter inventory.
- **Empty / Ambiguous Input:** Blank messages return a prompt without calling the LLM or creating spurious support tickets.
- **Verification Coverage:** Guardrails (`numbersGrounded()`, order email privacy, fallback, and escalation) are continuously tested in `tests/chatbot.test.ts` and `tests/api.integration.test.ts`.
