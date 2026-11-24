# ShopSmart User Manual

## 1. Customer Storefront Guide

### 1.1 Browsing & Searching Products
- Use the **Browse by Category** cards (`All Essentials`, `Stationery`, `Electronics`, `Accessories`) or the top navigation bar to filter products.
- Enter keywords in the search bar (e.g., `Notebook`, `Lamp`) and press **Enter** or click the search icon.
- Click any product card image, title, or **Details** button to open the **Product Details** modal, inspect multiple gallery images, check live stock availability, adjust quantity, and click **Add to Bag**.

### 1.2 Managing Your Shopping Bag & Discounts
- Click **Add to Cart** on any product card or inside the Product Details modal.
- In the **Order Summary** panel on the right:
  - Use **`+`** and **`-`** to adjust item quantities or click **Remove** to delete a line item.
  - **Bulk Discount (Automatic):** Ordering **10 or more units** of the same product automatically applies a **5% bulk discount**.
  - **Promo Code:** Enter `SAVE10` in the promo box and click **Apply** to receive an additional **10% off** the cart subtotal.

### 1.3 Checkout & Mock Payment
1. Enter your **Receipt & Order Email** (pre-filled automatically if signed in).
2. Enter a payment token:
   - `tok_ok` (default) — Simulates an approved payment and places a `PAID` order.
   - `tok_fail` — Simulates a declined card (`payment declined`) and keeps your cart intact.
3. Click **Complete Checkout**. You will receive an Order ID and confirmation summary.

### 1.4 Customer Account & Order Tracking
- Click **Sign In** in the header to register a new account (name, email, password >= 8 chars), sign in with email/password, or click **Continue with Google**.
- Navigate to **Orders** in the top menu:
  - Signed-in customers automatically see their complete **Order History**.
  - Guests can track a specific order by entering **Order #** and the exact **Checkout email**.

### 1.5 AI Support Chatbot
- Click the floating violet chat icon at the bottom-right (or **Ask AI Assistant** in the hero).
- Use quick prompts (`Shipping`, `Refunds`, `Coupons`) or type a question:
  - **Store Policies:** Answered using `src/chatbot/policy.md` via Gemini (`@google/genai`) or offline fallback.
  - **Order Status:** Type `order #12 you@example.com` (email must match the order record).
  - **Escalation:** Questions not covered by store policy are escalated to human support and logged in PostgreSQL for admin review.

---

## 2. Admin Operations Guide

### 2.1 Accessing the Admin Dashboard
1. On first setup (when no admin exists in PostgreSQL), register or sign in as a user, reopen the Account modal, and click **Claim Admin Role (First-Run Setup)**.
2. Once signed in as an admin, the **Admin** tab appears in the navigation bar.
3. Automated scripts or Postman requests can also pass `X-Owner-Token` when `OWNER_TOKEN` is configured on the server.

### 2.2 Managing Products, Orders & Support Escalations
- **KPIs & Charts:** View live counts for products, low-stock items (`<= 10`), gross revenue, delivered orders, open support escalations, and visual status/stock bars.
- **Add New Product:** Fill in name, category, description, price (INR), and initial stock, then click **Add Product**.
- **Edit / Delete Products:** Update price or stock inline in the **Product Management** table and click **Update**, or click **Delete** (blocked safely if the product appears in past orders).
- **Order Fulfillment:** Select `PAID`, `PACKED`, `SHIPPED`, `DELIVERED`, or `CANCELLED` in **Order Management** and click **Save**.
- **Escalated Support Tickets:** Review customer questions escalated by the AI chatbot at the bottom of the dashboard.
