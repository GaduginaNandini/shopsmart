# ShopSmart — E-Commerce Platform with AI Support Chatbot

**Course:** AI in Software Engineering, Project P03

ShopSmart is a full-stack e-commerce web application built with **Express**, **TypeScript**, **PostgreSQL (Drizzle ORM)**, **Firebase Authentication**, and the **Gemini AI (`@google/genai`)** customer-support chatbot.

## Architecture
```
Browser (HTML/CSS/TypeScript bundled via esbuild)
   │
   ├── Firebase Google Sign-In + Email/Password Session Auth
   ├── Storefront, Cart, Checkout (Mock Payment), Order History, Admin Dashboard
   └── Express + TypeScript API (port 3000)
          ├── PostgreSQL via Drizzle ORM (users, products, carts, cart_items, orders, order_items, support_tickets)
          ├── Prometheus-compatible /metrics & /health endpoints
          └── AI Support Chatbot (@google/genai gemini-4-hydrogen)
                 ├── Order status lookup in PostgreSQL (email-verified)
                 ├── Policy-grounded Gemini responses (src/chatbot/policy.md)
                 ├── Offline keyword policy retrieval fallback
                 └── Human escalation persisted to support_tickets
```

## Features
- **Authentication & Roles**: Customer registration and login (`scrypt` password hashing + HMAC Bearer tokens), Google Sign-In via Firebase Auth, and one-time first-admin role bootstrap (plus `X-Owner-Token` support for automated API clients).
- **Product Catalogue**: Search by keyword and filter by category backed by PostgreSQL.
- **Cart & Pricing Rules**: Persistent carts with quantity updates, 5% bulk discount for 10+ units of an item, `SAVE10` 10% cart coupon, and half-up cent rounding.
- **Transactional Checkout & Mock Payment**: Atomic PostgreSQL stock deduction (`tok_fail` declines payment; other tokens approve with a payment reference).
- **Order History & Admin Dashboard**: Authenticated customer order history, email-verified order lookup, admin product CRUD, order status management (`PAID`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`), and escalated support ticket queue.
- **Responsible-AI Chatbot**: Answers from `src/chatbot/policy.md` using `@google/genai` (`gemini-4-hydrogen`) when `GEMINI_API_KEY` is configured, verifies numeric grounding against policy text, falls back to offline policy retrieval if needed, and escalates ungrounded questions to `support_tickets`.

## Quick Start (Local / Node 22)
1. Copy `.env.example` to `.env` and configure `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`, and optional `GEMINI_API_KEY` / `OWNER_TOKEN`.
2. Install dependencies and push the database schema:
   ```bash
   npm install
   npx drizzle-kit push --config=src/db/drizzle.config.ts
   ```
3. Build and start:
   ```bash
   npm run build
   npm run dev
   ```
   The app listens on `http://0.0.0.0:3000`.

## Verification Commands
```bash
npm run lint      # TypeScript type-checking (tsc --noEmit)
npm run build     # Client bundle (esbuild) + TypeScript check
npm test          # Vitest unit & Supertest API integration tests
```

## Docker & Monitoring (External Execution)
Run the app and PostgreSQL together:
```bash
docker compose up --build
```
Run Prometheus + Grafana monitoring stack:
```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build
```
External QA configurations included in the repository:
- **CI/CD**: `.github/workflows/ci.yml`, `Jenkinsfile`
- **API Collection**: `postman/shopsmart.postman_collection.json`
- **E2E Browser Tests**: `selenium_tests/` (`pytest selenium_tests`)
- **Load Testing**: `loadtest/locustfile.py` (`locust -f loadtest/locustfile.py --host http://localhost:3000`)
- **Code Quality**: `sonar-project.properties`

## API Reference
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Health check |
| GET | `/metrics` | Public | Prometheus-formatted metrics |
| GET | `/api/auth/status` | Public | Check if an admin account exists |
| POST | `/api/auth/register` | Public | Register a customer account |
| POST | `/api/auth/login` | Public | Sign in with email and password |
| POST | `/api/auth/firebase` | Bearer | Verify Firebase ID token and sync user |
| POST | `/api/auth/claim-admin` | Bearer | Claim initial admin role if none exists |
| GET | `/api/auth/me` | Bearer | Current authenticated user profile |
| GET | `/api/products` | Public | List/search/filter products |
| POST | `/api/products` | Admin | Create a product |
| PATCH | `/api/products/:id` | Admin | Update a product |
| DELETE | `/api/products/:id` | Admin | Delete an unused product |
| POST | `/api/cart` | Optional | Create a shopping cart |
| GET | `/api/cart/:cartId` | Public | Fetch cart items and calculated total |
| POST | `/api/cart/:cartId/items` | Public | Add item to cart |
| PATCH | `/api/cart/:cartId/items/:productId` | Public | Update cart item quantity |
| DELETE | `/api/cart/:cartId/items/:productId` | Public | Remove item from cart |
| POST | `/api/cart/:cartId/coupon` | Public | Apply coupon (`SAVE10`) |
| POST | `/api/cart/:cartId/checkout` | Optional | Checkout with mock payment (`tok_fail` declines) |
| GET | `/api/orders` | Bearer | Authenticated customer's orders (or all for admin) |
| GET | `/api/orders/:orderId` | Optional | Order details (requires owner auth or `?email=` match) |
| PATCH | `/api/orders/:orderId/status` | Admin | Update order fulfillment status |
| POST | `/api/chat` | Optional | Support chatbot endpoint |
| GET | `/api/support/tickets` | Admin | List escalated support tickets |
