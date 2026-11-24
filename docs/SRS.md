# ShopSmart Software Requirements Specification (SRS)

## 1. Purpose
ShopSmart is a full-stack e-commerce platform with an integrated AI customer-support chatbot. It provides product browsing, cart and discount calculations, transactional checkout with mocked payments, customer accounts, order tracking, admin inventory/order management, and policy-grounded AI customer support.

## 2. System Architecture Overview
- **Client:** Dark-mode responsive storefront (`public/index.html`, `src/client/main.ts` bundled to `public/assets/app.js` with `esbuild`).
- **API & Business Logic:** Express + TypeScript (`server.ts`, `src/app.ts`, `src/routes.ts`, `src/pricing.ts`).
- **Persistence:** PostgreSQL via Drizzle ORM (`src/db/schema.ts`, `src/db/repository.ts`, migrations in `drizzle/`).
- **Authentication:** Local `scrypt` password hashing + HMAC Bearer tokens (`src/lib/session.ts`) and Firebase Authentication (`src/lib/firebase-admin.ts`).
- **AI Support:** Gemini (`@google/genai` `gemini-4-hydrogen`) in `src/chatbot/service.ts` grounded against `src/chatbot/policy.md` with offline keyword fallback and human escalation to `support_tickets`.
- **Observability & DevOps:** `/health`, `/metrics`, Prometheus, Grafana, Docker, GitHub Actions, Jenkins, Vitest/Supertest, Selenium, Newman, SonarQube, Locust.

## 3. User Roles
1. **Guest / Customer:** Browse products, inspect product details, search/filter catalogue, register/log in (email+password or Google Sign-In), manage cart items, apply coupons, complete checkout, view order history/lookup, and query the support chatbot.
2. **Admin / Shop Owner:** Create/update/delete products, view KPI analytics, manage order fulfillment statuses (`PAID`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`), and review escalated support tickets.

## 4. Functional Requirements
- **FR-1 Authentication:** Customers register with name, email, and password (minimum 8 characters, salted `scrypt` hashes) or sign in via Google Firebase Auth. Sessions use server-verified Bearer tokens; first-run setup allows claiming the initial admin role once (`POST /api/auth/claim-admin`).
- **FR-2 Product Catalogue:** Products are stored in PostgreSQL (`products` table) and support search (`?q=`), category filtering (`?category=`), and individual detail retrieval (`GET /api/products/:id`).
- **FR-3 Cart & Pricing Rules:**
  - **R1:** 10 or more units of a single product receive a 5% bulk discount on that line.
  - **R2:** Coupon `SAVE10` applies a 10% discount to the cart subtotal after bulk discounts.
  - **R3:** All monetary values use half-up rounding to 2 decimal places (`src/pricing.ts`).
- **FR-4 Transactional Checkout:** Checkout executes inside a PostgreSQL transaction that checks stock atomically (`stock >= quantity`), validates email and card token (`tok_fail` declines), creates `orders` and `order_items` records, and empties the cart.
- **FR-5 Order Privacy & Fulfillment:** Order details (`GET /api/orders/:orderId`) are returned only to the authenticated owner, an admin, or a caller providing the exact checkout email. Admins update statuses via `PATCH /api/orders/:orderId/status`.
- **FR-6 AI Support Chatbot:**
  - Extracts order IDs (`order #N`) and queries PostgreSQL only when the email matches.
  - Uses `@google/genai` (`gemini-4-hydrogen`) constrained to `src/chatbot/policy.md` when `GEMINI_API_KEY` is configured, verifying that every numeric value in the response appears in the policy.
  - Falls back to deterministic retrieval over `src/chatbot/policy.md` when the LLM is unavailable.
  - Escalates ungrounded or out-of-policy questions to human support and logs them in `support_tickets`.

## 5. Non-Functional Requirements
- **Persistence:** PostgreSQL with Drizzle ORM and versioned SQL migrations (`drizzle/`).
- **Observability:** `/health` JSON readiness endpoint and `/metrics` Prometheus exposition (`shopsmart_up`, `shopsmart_requests_total`, `shopsmart_errors_total`, `shopsmart_orders_ok_total`, `shopsmart_orders_failed_total`, `shopsmart_response_seconds_sum`, `shopsmart_response_seconds_avg`).
- **Security:** Parameterized Drizzle queries, `timingSafeEqual` token verification, no committed credentials, and client auth tokens held strictly in JS memory.
- **Portability:** Containerized with Node 22 and PostgreSQL 16 via `Dockerfile` and `docker-compose.yml`.
