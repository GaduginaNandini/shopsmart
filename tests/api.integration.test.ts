import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  users: [
    {
      id: 1,
      uid: "local:cust-1",
      email: "cust@example.com",
      name: "Customer One",
      role: "customer",
    },
    {
      id: 2,
      uid: "local:admin-1",
      email: "admin@example.com",
      name: "Admin One",
      role: "admin",
    },
  ],
  products: [
    {
      id: 1,
      name: "Notebook",
      description: "A5 Notebook",
      category: "Stationery",
      price: "50.00",
      stock: 100,
    },
    {
      id: 2,
      name: "Pen Set",
      description: "Gel pens",
      category: "Stationery",
      price: "120.00",
      stock: 40,
    },
  ],
  carts: new Map<number, { id: number; coupon: string | null; items: Array<{ product_id: number; quantity: number }> }>(),
  orders: new Map<number, { id: number; userId: number | null; email: string; status: string; total: string; paymentRef: string; items: Array<{ productName: string; quantity: number; unitPrice: string }> }>(),
};

vi.mock("../src/db/repository.ts", async () => {
  class AppError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  }
  class DatabaseError extends Error {}

  return {
    AppError,
    DatabaseError,
    ORDER_STATUSES: ["PAID", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"],
    getUserById: vi.fn(async (id: number) => state.users.find((u) => u.id === id) ?? null),
    hasAnyAdmin: vi.fn(async () => state.users.some((u) => u.role === "admin")),
    registerLocalUser: vi.fn(async (name: string, email: string, password: string) => {
      if (!name || !email.includes("@") || password.length < 8) {
        throw new AppError("Invalid registration input", 400);
      }
      const user = {
        id: state.users.length + 1,
        uid: `local:${Date.now()}`,
        email: email.toLowerCase(),
        name,
        role: "customer",
      };
      state.users.push(user);
      return user;
    }),
    authenticateLocalUser: vi.fn(async (email: string) => {
      const user = state.users.find((u) => u.email === email.toLowerCase());
      if (!user) throw new AppError("Invalid email or password.", 401);
      return user;
    }),
    listProducts: vi.fn(async () => state.products),
    getProductById: vi.fn(async (id: number) => state.products.find((p) => p.id === id) ?? null),
    createProduct: vi.fn(async (input: { name: string; price: string | number; stock?: number }) => {
      if (!input.name || Number(input.price) < 0) {
        throw new AppError("name and non-negative price required", 400);
      }
      const created = {
        id: state.products.length + 1,
        name: input.name,
        description: "",
        category: "General",
        price: Number(input.price).toFixed(2),
        stock: Number(input.stock ?? 0),
      };
      state.products.push(created);
      return created;
    }),
    createCart: vi.fn(async () => {
      const id = state.carts.size + 1;
      state.carts.set(id, { id, coupon: null, items: [] });
      return { cart_id: id, coupon: null, items: [], total: "0.00" };
    }),
    getCart: vi.fn(async (id: number) => {
      const c = state.carts.get(id);
      if (!c) return null;
      return { cart_id: c.id, coupon: c.coupon, items: [], total: "0.00" };
    }),
    addItemToCart: vi.fn(async (cartId: number, productId: number, quantity: number) => {
      const c = state.carts.get(cartId);
      if (!c) throw new AppError("cart not found", 404);
      const p = state.products.find((x) => x.id === productId);
      if (!p) throw new AppError("product not found", 400);
      if (quantity > p.stock) throw new AppError("insufficient stock", 400);
      c.items.push({ product_id: productId, quantity });
      const total = (Number(p.price) * quantity).toFixed(2);
      return {
        cart_id: cartId,
        coupon: c.coupon,
        items: [{ product_id: p.id, name: p.name, quantity, unit_price: p.price }],
        total,
      };
    }),
    applyCouponToCart: vi.fn(async (cartId: number, code: string) => {
      if (code.toUpperCase() !== "SAVE10") throw new AppError("invalid coupon", 400);
      const c = state.carts.get(cartId);
      if (!c) throw new AppError("cart not found", 404);
      c.coupon = "SAVE10";
      return { cart_id: cartId, coupon: "SAVE10", items: [], total: "45.00" };
    }),
    checkoutCart: vi.fn(async (cartId: number, email: string, cardToken: string, userId?: number | null) => {
      const c = state.carts.get(cartId);
      if (!c) throw new AppError("cart not found", 404);
      if (c.items.length === 0) throw new AppError("cart is empty", 400);
      if (!email.includes("@")) throw new AppError("valid email required", 400);
      if (cardToken === "tok_fail") throw new AppError("payment declined", 400);
      const orderId = state.orders.size + 1;
      const order = {
        id: orderId,
        userId: userId ?? null,
        email: email.toLowerCase(),
        status: "PAID",
        total: "45.00",
        paymentRef: "pay_test123",
        items: [{ productName: "Notebook", quantity: 1, unitPrice: "50.00" }],
      };
      state.orders.set(orderId, order);
      c.items = [];
      return order;
    }),
    getOrderById: vi.fn(async (orderId: number) => state.orders.get(orderId) ?? null),
    listOrders: vi.fn(async () => Array.from(state.orders.values())),
    createSupportTicket: vi.fn(async () => null),
    listSupportTickets: vi.fn(async () => []),
  };
});

import { createApp } from "../src/app.ts";
import { signSessionToken } from "../src/lib/session.ts";

describe("ShopSmart HTTP API integration", () => {
  beforeEach(() => {
    process.env.OWNER_TOKEN = "test-owner-token";
  });

  it("serves /health and /metrics", async () => {
    const app = createApp();
    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ok" });

    const metrics = await request(app).get("/metrics");
    expect(metrics.status).toBe(200);
    expect(metrics.text).toContain("shopsmart_requests_total");
  });

  it("enforces admin authorization on POST /api/products", async () => {
    const app = createApp();
    const unauth = await request(app)
      .post("/api/products")
      .send({ name: "Eraser", price: "10.00", stock: 5 });
    expect(unauth.status).toBe(403);

    const withOwnerToken = await request(app)
      .post("/api/products")
      .set("X-Owner-Token", "test-owner-token")
      .send({ name: "Eraser", price: "10.00", stock: 5 });
    expect(withOwnerToken.status).toBe(201);
    expect(withOwnerToken.body.name).toBe("Eraser");
  });

  it("supports register, cart, coupon, checkout, and order privacy", async () => {
    const app = createApp();

    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test Buyer", email: "buyer@example.com", password: "Password123" });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();

    const cartRes = await request(app).post("/api/cart");
    expect(cartRes.status).toBe(201);
    const cartId = cartRes.body.cart_id;

    const addRes = await request(app)
      .post(`/api/cart/${cartId}/items`)
      .send({ product_id: 1, quantity: 1 });
    expect(addRes.status).toBe(200);

    const declined = await request(app)
      .post(`/api/cart/${cartId}/checkout`)
      .send({ email: "buyer@example.com", card_token: "tok_fail" });
    expect(declined.status).toBe(400);
    expect(declined.body.error).toBe("payment declined");

    const ok = await request(app)
      .post(`/api/cart/${cartId}/checkout`)
      .send({ email: "buyer@example.com", card_token: "tok_ok" });
    expect(ok.status).toBe(201);
    const orderId = ok.body.order_id;

    const wrongEmail = await request(app).get(
      `/api/orders/${orderId}?email=other@example.com`
    );
    expect(wrongEmail.status).toBe(404);

    const rightEmail = await request(app).get(
      `/api/orders/${orderId}?email=buyer@example.com`
    );
    expect(rightEmail.status).toBe(200);
    expect(rightEmail.body.status).toBe("PAID");
  });

  it("routes /api/orders to authenticated users only", async () => {
    const app = createApp();
    const unauth = await request(app).get("/api/orders");
    expect(unauth.status).toBe(401);

    const token = signSessionToken(state.users[0]);
    const auth = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${token}`);
    expect(auth.status).toBe(200);
    expect(Array.isArray(auth.body)).toBe(true);
  });

  it("answers policy questions via POST /api/chat", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/chat")
      .send({ message: "How long does shipping take?" });
    expect(res.status).toBe(200);
    expect(res.body.answer).toContain("business days");
  });
});
