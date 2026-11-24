# ShopSmart Software Requirements Specification (SRS)

## 1. Purpose
ShopSmart is a full-stack e-commerce platform with an integrated AI customer-support chatbot. It provides product browsing, cart and discount calculations, transactional checkout with mocked payments, customer accounts, order tracking, admin inventory/order management, and policy-grounded AI customer support.

## 2. User Roles
1. **Guest / Customer**: Browse products, register/log in (email+password or Google Sign-In), manage cart items, apply coupons, complete checkout, view order history, and query the support chatbot.
2. **Admin / Shop Owner**: Create/update/delete products, manage order statuses (`PAID`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`), and review escalated support tickets.

## 3. Functional Requirements
- **FR-1 Authentication**: Customers can register with name, email, and password (minimum 8 characters, stored using salted `scrypt` hashes) or sign in with Google via Firebase Auth. Sessions use Bearer tokens verified on the server.
- **FR-2 Product Catalogue**: Products are persisted in PostgreSQL (`products` table) and support search (`?q=`) and category filtering (`?category=`).
- **FR-3 Cart & Pricing Rules**:
  - R1: 10 or more units of a single product receive a 5% bulk discount on that line.
  - R2: Coupon `SAVE10` applies a 10% discount to the cart subtotal after bulk discounts.
  - R3: All monetary values use half-up rounding to 2 decimal places.
- **FR-4 Transactional Checkout**: Checkout runs inside a PostgreSQL transaction that verifies stock atomically (`stock >= quantity`), validates email and payment token (`tok_fail` declines), creates `orders` and `order_items` records, and clears the cart.
- **FR-5 Order Privacy**: Order details are returned only to the authenticated order owner, an admin, or a caller providing the exact checkout email.
- **FR-6 AI Support Chatbot**:
  - Extracts order IDs (`order #N`) and queries PostgreSQL only when the email matches.
  - Uses `@google/genai` (`gemini-4-hydrogen`) constrained to `src/chatbot/policy.md` when `GEMINI_API_KEY` is present, checking that any numbers in the response appear in the policy.
  - Falls back to deterministic keyword retrieval over `src/chatbot/policy.md` if the LLM is unavailable.
  - Escalates ungrounded or unsupported questions to human support and logs them in `support_tickets`.

## 4. Non-Functional Requirements
- **Persistence**: PostgreSQL with Drizzle ORM and generated SQL migrations (`drizzle/`).
- **Observability**: `/health` JSON endpoint and `/metrics` Prometheus text endpoint.
- **Security**: Parameterized ORM queries, `timingSafeEqual` token checks, no secrets committed to source, and in-memory token handling on the client.
