import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cartTotal } from "../src/pricing.ts";

interface MockUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string;
  password?: string;
}

interface MockProduct {
  id: number;
  name: string;
  description: string;
  category: string;
  price: string;
  stock: number;
}

interface MockCart {
  id: number;
  coupon: string | null;
  items: Array<{ product_id: number; quantity: number }>;
}

interface MockOrder {
  id: number;
  userId: number | null;
  email: string;
  status: string;
  total: string;
  paymentRef: string;
  items: Array<{ productName: string; quantity: number; unitPrice: string }>;
}

const state: {
  users: MockUser[];
  products: MockProduct[];
  carts: Map<number, MockCart>;
  orders: Map<number, MockOrder>;
} = {
  users: [],
  products: [],
  carts: new Map(),
  orders: new Map(),
};

function resetState() {
  state.users = [
    {
      id: 1,
      uid: "local:cust-1",
      email: "cust@example.com",
      name: "Customer One",
      role: "customer",
      password: "Password123!",
    },
    {
      id: 2,
      uid: "local:admin-1",
      email: "admin@example.com",
      name: "Admin One",
      role: "admin",
      password: "AdminPass123!",
    },
  ];
  state.products = [
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
      name: "Desk Lamp",
      description: "LED Desk Lamp",
      category: "Electronics",
      price: "499.00",
      stock: 40,
    },
  ];
  state.carts = new Map();
  state.orders = new Map();
}

function formatCart(cart: MockCart) {
  const items = cart.items.map((item) => {
    const product = state.products.find((p) => p.id === item.product_id)!;
    return {
      product_id: product.id,
      name: product.name,
      quantity: item.quantity,
      unit_price: product.price,
    };
  });
  const total = cartTotal(
    items.map((i) => [i.unit_price, i.quantity] as [string, number]),
    cart.coupon
  );
  return {
    cart_id: cart.id,
    coupon: cart.coupon,
    items,
    total,
  };
}

vi.mock("../src/db/repository.ts", async () => {
  const ORDER_STATUSES = ["PAID", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"];

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
    ORDER_STATUSES,
    getUserById: vi.fn(async (id: number) => state.users.find((u) => u.id === id) ?? null),
    hasAnyAdmin: vi.fn(async () => state.users.some((u) => u.role === "admin")),
    registerLocalUser: vi.fn(async (name: string, email: string, password: string) => {
      if (!name || !email.includes("@") || password.length < 8) {
        throw new AppError("Invalid registration input", 400);
      }
      if (state.users.some((u) => u.email === email.toLowerCase())) {
        throw new AppError("Email is already registered", 409);
      }
      const user: MockUser = {
        id: state.users.length + 1,
        uid: `local:${Date.now()}`,
        email: email.toLowerCase(),
        name,
        role: "customer",
        password,
      };
      state.users.push(user);
      return user;
    }),
    authenticateLocalUser: vi.fn(async (email: string, password: string) => {
      const user = state.users.find((u) => u.email === email.toLowerCase());
      if (!user || user.password !== password) {
        throw new AppError("Invalid email or password.", 401);
      }
      return user;
    }),
    listProducts: vi.fn(async (filter?: { q?: string; category?: string }) => {
      return state.products.filter((p) => {
        if (filter?.category && p.category.toLowerCase() !== filter.category.toLowerCase()) {
          return false;
        }
        if (filter?.q) {
          const q = filter.q.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
          );
        }
        return true;
      });
    }),
    getProductById: vi.fn(async (id: number) => state.products.find((p) => p.id === id) ?? null),
    createProduct: vi.fn(
      async (input: { name: string; description?: string; category?: string; price: string | number; stock?: number }) => {
        if (!input.name || Number(input.price) < 0) {
          throw new AppError("name and non-negative price required", 400);
        }
        const created: MockProduct = {
          id: state.products.length + 1,
          name: input.name,
          description: input.description ?? "",
          category: input.category ?? "General",
          price: Number(input.price).toFixed(2),
          stock: Number(input.stock ?? 0),
        };
        state.products.push(created);
        return created;
      }
    ),
    updateProduct: vi.fn(async (id: number, input: Partial<MockProduct>) => {
      const prod = state.products.find((p) => p.id === id);
      if (!prod) throw new AppError("product not found", 404);
      if (input.name !== undefined) prod.name = input.name;
      if (input.description !== undefined) prod.description = input.description;
      if (input.category !== undefined) prod.category = input.category;
      if (input.price !== undefined) prod.price = Number(input.price).toFixed(2);
      if (input.stock !== undefined) prod.stock = Number(input.stock);
      return prod;
    }),
    deleteProduct: vi.fn(async (id: number) => {
      const idx = state.products.findIndex((p) => p.id === id);
      if (idx === -1) throw new AppError("product not found", 404);
      state.products.splice(idx, 1);
    }),
    createCart: vi.fn(async () => {
      const id = state.carts.size + 1;
      const cart: MockCart = { id, coupon: null, items: [] };
      state.carts.set(id, cart);
      return formatCart(cart);
    }),
    getCart: vi.fn(async (id: number) => {
      const c = state.carts.get(id);
      return c ? formatCart(c) : null;
    }),
    addItemToCart: vi.fn(async (cartId: number, productId: number, quantity: number) => {
      const c = state.carts.get(cartId);
      if (!c) throw new AppError("cart not found", 404);
      const p = state.products.find((x) => x.id === productId);
      if (!p) throw new AppError("product not found", 400);
      if (quantity <= 0) throw new AppError("quantity must be > 0", 400);
      const existing = c.items.find((i) => i.product_id === productId);
      const nextQty = (existing?.quantity ?? 0) + quantity;
      if (nextQty > p.stock) throw new AppError("insufficient stock", 400);
      if (existing) existing.quantity = nextQty;
      else c.items.push({ product_id: productId, quantity });
      return formatCart(c);
    }),
    updateCartItemQty: vi.fn(async (cartId: number, productId: number, quantity: number) => {
      const c = state.carts.get(cartId);
      if (!c) throw new AppError("cart not found", 404);
      if (quantity <= 0) {
        c.items = c.items.filter((i) => i.product_id !== productId);
        return formatCart(c);
      }
      const p = state.products.find((x) => x.id === productId);
      if (!p) throw new AppError("product not found", 404);
      if (quantity > p.stock) throw new AppError("insufficient stock", 400);
      const existing = c.items.find((i) => i.product_id === productId);
      if (existing) existing.quantity = quantity;
      else c.items.push({ product_id: productId, quantity });
      return formatCart(c);
    }),
    removeItemFromCart: vi.fn(async (cartId: number, productId: number) => {
      const c = state.carts.get(cartId);
      if (!c) throw new AppError("cart not found", 404);
      c.items = c.items.filter((i) => i.product_id !== productId);
      return formatCart(c);
    }),
    applyCouponToCart: vi.fn(async (cartId: number, code: string) => {
      if (code.toUpperCase() !== "SAVE10") throw new AppError("invalid coupon", 400);
      const c = state.carts.get(cartId);
      if (!c) throw new AppError("cart not found", 404);
      c.coupon = "SAVE10";
      return formatCart(c);
    }),
    checkoutCart: vi.fn(async (cartId: number, email: string, cardToken: string, userId?: number | null) => {
      const c = state.carts.get(cartId);
      if (!c) throw new AppError("cart not found", 404);
      if (c.items.length === 0) throw new AppError("cart is empty", 400);
      if (!email.includes("@")) throw new AppError("valid email required", 400);
      if (cardToken === "tok_fail") throw new AppError("payment declined", 400);
      const formatted = formatCart(c);
      const orderId = state.orders.size + 1;
      const order: MockOrder = {
        id: orderId,
        userId: userId ?? null,
        email: email.toLowerCase(),
        status: "PAID",
        total: formatted.total,
        paymentRef: `pay_test${orderId}`,
        items: formatted.items.map((i) => ({
          productName: i.name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
        })),
      };
      state.orders.set(orderId, order);
      c.items = [];
      c.coupon = null;
      return order;
    }),
    getOrderById: vi.fn(async (orderId: number) => state.orders.get(orderId) ?? null),
    listOrders: vi.fn(async (opts: { userId: number; email: string; isAdmin: boolean }) => {
      const all = Array.from(state.orders.values());
      if (opts.isAdmin) return all;
      return all.filter(
        (o) => o.userId === opts.userId || o.email.toLowerCase() === opts.email.toLowerCase()
      );
    }),
    updateOrderStatus: vi.fn(async (orderId: number, status: string) => {
      if (!ORDER_STATUSES.includes(status)) {
        throw new AppError("invalid order status", 400);
      }
      const order = state.orders.get(orderId);
      if (!order) throw new AppError("order not found", 404);
      order.status = status;
      return order;
    }),
    createSupportTicket: vi.fn(async () => null),
    listSupportTickets: vi.fn(async () => []),
  };
});

import { createApp } from "../src/app.ts";
import { signSessionToken } from "../src/lib/session.ts";

describe("ShopSmart HTTP API integration", () => {
  beforeEach(() => {
    resetState();
    process.env.OWNER_TOKEN = "test-owner-token";
  });

  it("serves /health and Prometheus-formatted /metrics", async () => {
    const app = createApp();
    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ok" });

    const metrics = await request(app).get("/metrics");
    expect(metrics.status).toBe(200);
    expect(metrics.text).toContain("shopsmart_up 1");
    expect(metrics.text).toContain("shopsmart_requests_total");
    expect(metrics.text).toContain("shopsmart_errors_total");
    expect(metrics.text).toContain("shopsmart_response_seconds_avg");
  });

  it("handles registration, login, invalid credentials, and /api/auth/me", async () => {
    const app = createApp();

    const statusRes = await request(app).get("/api/auth/status");
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.hasAdmin).toBe(true);

    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test Buyer", email: "buyer@example.com", password: "Password123!" });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();

    const badLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "buyer@example.com", password: "WrongPassword" });
    expect(badLogin.status).toBe(401);

    const goodLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "buyer@example.com", password: "Password123!" });
    expect(goodLogin.status).toBe(200);
    const token = goodLogin.body.token;

    const meUnauth = await request(app).get("/api/auth/me");
    expect(meUnauth.status).toBe(401);

    const meAuth = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(meAuth.status).toBe(200);
    expect(meAuth.body.user.email).toBe("buyer@example.com");
  });

  it("supports product browsing, details, search, and admin CRUD", async () => {
    const app = createApp();

    const listAll = await request(app).get("/api/products");
    expect(listAll.status).toBe(200);
    expect(listAll.body.length).toBe(2);

    const filtered = await request(app).get("/api/products?category=Electronics");
    expect(filtered.status).toBe(200);
    expect(filtered.body.length).toBe(1);
    expect(filtered.body[0].name).toBe("Desk Lamp");

    const searched = await request(app).get("/api/products?q=Notebook");
    expect(searched.status).toBe(200);
    expect(searched.body[0].name).toBe("Notebook");

    const detail = await request(app).get("/api/products/1");
    expect(detail.status).toBe(200);
    expect(detail.body.name).toBe("Notebook");

    const missing = await request(app).get("/api/products/999");
    expect(missing.status).toBe(404);

    const unauthCreate = await request(app)
      .post("/api/products")
      .send({ name: "Eraser", price: "10.00", stock: 5 });
    expect(unauthCreate.status).toBe(403);

    const created = await request(app)
      .post("/api/products")
      .set("X-Owner-Token", "test-owner-token")
      .send({ name: "Eraser", category: "Stationery", price: "10.00", stock: 5 });
    expect(created.status).toBe(201);
    const newId = created.body.id;

    const updated = await request(app)
      .patch(`/api/products/${newId}`)
      .set("X-Owner-Token", "test-owner-token")
      .send({ price: "12.50", stock: 15 });
    expect(updated.status).toBe(200);
    expect(updated.body.price).toBe("12.50");
    expect(updated.body.stock).toBe(15);

    const deleted = await request(app)
      .delete(`/api/products/${newId}`)
      .set("X-Owner-Token", "test-owner-token");
    expect(deleted.status).toBe(204);
  });

  it("handles cart updates, pricing rules, coupons, checkout, and order management", async () => {
    const app = createApp();
    const customerToken = signSessionToken(state.users[0]);

    const cartRes = await request(app)
      .post("/api/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(cartRes.status).toBe(201);
    const cartId = cartRes.body.cart_id;

    const addRes = await request(app)
      .post(`/api/cart/${cartId}/items`)
      .send({ product_id: 1, quantity: 2 });
    expect(addRes.status).toBe(200);
    expect(addRes.body.total).toBe("100.00");

    const patchQty = await request(app)
      .patch(`/api/cart/${cartId}/items/1`)
      .send({ quantity: 10 });
    expect(patchQty.status).toBe(200);
    // 10 * 50.00 with 5% bulk discount = 475.00
    expect(patchQty.body.total).toBe("475.00");

    const badCoupon = await request(app)
      .post(`/api/cart/${cartId}/coupon`)
      .send({ code: "INVALID" });
    expect(badCoupon.status).toBe(400);

    const goodCoupon = await request(app)
      .post(`/api/cart/${cartId}/coupon`)
      .send({ code: "SAVE10" });
    expect(goodCoupon.status).toBe(200);
    // 475.00 with 10% coupon = 427.50
    expect(goodCoupon.body.total).toBe("427.50");

    const getCart = await request(app).get(`/api/cart/${cartId}`);
    expect(getCart.status).toBe(200);
    expect(getCart.body.total).toBe("427.50");

    const declined = await request(app)
      .post(`/api/cart/${cartId}/checkout`)
      .send({ email: "cust@example.com", card_token: "tok_fail" });
    expect(declined.status).toBe(400);
    expect(declined.body.error).toBe("payment declined");

    const ok = await request(app)
      .post(`/api/cart/${cartId}/checkout`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ email: "cust@example.com", card_token: "tok_ok" });
    expect(ok.status).toBe(201);
    expect(ok.body.total).toBe("427.50");
    const orderId = ok.body.order_id;

    const wrongEmail = await request(app).get(
      `/api/orders/${orderId}?email=other@example.com`
    );
    expect(wrongEmail.status).toBe(404);

    const rightEmail = await request(app).get(
      `/api/orders/${orderId}?email=cust@example.com`
    );
    expect(rightEmail.status).toBe(200);
    expect(rightEmail.body.status).toBe("PAID");

    const custOrders = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(custOrders.status).toBe(200);
    expect(custOrders.body.length).toBe(1);

    const forbiddenStatus = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ status: "SHIPPED" });
    expect(forbiddenStatus.status).toBe(403);

    const badStatus = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("X-Owner-Token", "test-owner-token")
      .send({ status: "LOST" });
    expect(badStatus.status).toBe(400);

    const shipped = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("X-Owner-Token", "test-owner-token")
      .send({ status: "SHIPPED" });
    expect(shipped.status).toBe(200);
    expect(shipped.body.status).toBe("SHIPPED");
  });

  it("supports removing cart items", async () => {
    const app = createApp();
    const cart = await request(app).post("/api/cart");
    const cartId = cart.body.cart_id;

    await request(app)
      .post(`/api/cart/${cartId}/items`)
      .send({ product_id: 1, quantity: 1 });

    const removed = await request(app).delete(`/api/cart/${cartId}/items/1`);
    expect(removed.status).toBe(200);
    expect(removed.body.items).toEqual([]);
    expect(removed.body.total).toBe("0.00");
  });

  it("requires authentication on GET /api/orders", async () => {
    const app = createApp();
    const unauth = await request(app).get("/api/orders");
    expect(unauth.status).toBe(401);
  });

  it("answers policy questions and escalates out-of-policy queries via POST /api/chat", async () => {
    const app = createApp();
    const policyReply = await request(app)
      .post("/api/chat")
      .send({ message: "How long does shipping take?" });
    expect(policyReply.status).toBe(200);
    expect(policyReply.body.answer).toContain("business days");
    expect(policyReply.body.escalated).toBe(false);

    const escalatedReply = await request(app)
      .post("/api/chat")
      .send({ message: "Do you sell moon rovers?" });
    expect(escalatedReply.status).toBe(200);
    expect(escalatedReply.body.escalated).toBe(true);
  });
});
