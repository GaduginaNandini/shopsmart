# Responsible AI Checklist — ShopSmart Support Chatbot

- [x] **Grounded Policy Only**: System prompt restricts Gemini (`gemini-4-hydrogen`) strictly to `src/chatbot/policy.md` and instructs `ESCALATE` when information is missing.
- [x] **Numeric Hallucination Guardrail**: `numbersGrounded()` verifies every numeric value in the model response exists in the written policy before returning it to the customer.
- [x] **Sensitive Topic Protection**: Offline fallback requires title-level keyword overlap for sensitive topics (`refund`, `compensation`, `chargeback`, `legal`) or escalates.
- [x] **Order Privacy Enforcement**: Order status lookup requires either an authenticated session matching the order owner or an explicit email match in the query.
- [x] **Human Escalation Persistence**: Escalated questions are recorded in the PostgreSQL `support_tickets` table for admin/support review.
- [x] **Server-Side Key Isolation**: `GEMINI_API_KEY` is accessed only in server-side Node.js code (`src/chatbot/service.ts`), never in browser bundles.
