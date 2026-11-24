/**
 * HTTP routes: catalogue, cart, checkout, orders, chatbot, health, metrics.
 */
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router, type Request, type Response } from "express";
import { answer as chatAnswer } from "./chatbot/service.ts";
import {
  allocateProductId,
  carts,
  orders,
  products,
  type Cart,
} from "./models.ts";
import { COUPONS, money } from "./pricing.ts";
import * as services from "./services.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_INDEX = path.resolve(__dirname, "..", "public", "index.html");

export const router = Router();

function cartJson(cart: Cart) {
  return {
    cart_id: cart.id,
    coupon: cart.coupon,
    items: cart.items.map((item) => {
      const product = products.get(item.product_id)!;
      return {
        product_id: item.product_id,
        name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
      };
    }),
    total: services.totalFor(cart),
  };
}

function ownerOk(req: Request): boolean {
  const expected = process.env.OWNER_TOKEN || "owner-dev-token";
  const provided = req.header("X-Owner-Token") ?? "";
  const a = Buffer.from(provided, "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

router.get("/metrics", (_req: Request, res: Response) => {
  const n = Math.max(services.metrics.requests, 1);
  const lines = [
    `shopsmart_requests_total ${services.metrics.requests}`,
    `shopsmart_errors_total ${services.metrics.errors}`,
    `shopsmart_orders_ok_total ${services.metrics.orders_ok}`,
    `shopsmart_orders_failed_total ${services.metrics.orders_failed}`,
    `shopsmart_response_seconds_avg ${(services.metrics.latency_sum / n).toFixed(6)}`,
  ];
  res
    .status(200)
    .set("Content-Type", "text/plain; version=0.0.4")
    .send(lines.join("\n") + "\n");
});

router.get("/api/products", (_req: Request, res: Response) => {
  const list = Array.from(products.values()).sort((a, b) => a.id - b.id);
  res.json(list);
});

router.post("/api/products", (req: Request, res: Response) => {
  if (!ownerOk(req)) {
    res.status(403).json({ error: "owner token required" });
    return;
  }
  const data = req.body ?? {};
  const priceNum = Number(data.price ?? -1);
  if (!data.name || Number.isNaN(priceNum) || priceNum < 0) {
    res.status(400).json({ error: "name and non-negative price required" });
    return;
  }
  const product = {
    id: allocateProductId(),
    name: String(data.name),
    price: money(data.price),
    stock: Number.parseInt(String(data.stock ?? 0), 10) || 0,
  };
  products.set(product.id, product);
  res.status(201).json(product);
});

router.post("/api/cart", (_req: Request, res: Response) => {
  res.status(201).json(cartJson(services.getOrCreateCart()));
});

router.get("/api/cart/:cartId", (req: Request, res: Response) => {
  const cartId = Number.parseInt(String(req.params.cartId), 10);
  const cart = Number.isNaN(cartId) ? undefined : carts.get(cartId);
  if (!cart) {
    res.status(404).json({ error: "cart not found" });
    return;
  }
  res.json(cartJson(cart));
});

router.post("/api/cart/:cartId/items", (req: Request, res: Response) => {
  const cartId = Number.parseInt(String(req.params.cartId), 10);
  const cart = Number.isNaN(cartId) ? undefined : carts.get(cartId);
  if (!cart) {
    res.status(404).json({ error: "cart not found" });
    return;
  }
  const data = req.body ?? {};
  try {
    const productId = Number.parseInt(String(data.product_id), 10);
    const quantity = Number.parseInt(String(data.quantity ?? 1), 10);
    services.addItem(cart, productId, quantity);
  } catch (err) {
    if (err instanceof services.CheckoutError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
  res.json(cartJson(cart));
});

router.delete(
  "/api/cart/:cartId/items/:productId",
  (req: Request, res: Response) => {
    const cartId = Number.parseInt(String(req.params.cartId), 10);
    const productId = Number.parseInt(String(req.params.productId), 10);
    const cart = Number.isNaN(cartId) ? undefined : carts.get(cartId);
    if (!cart) {
      res.status(404).json({ error: "cart not found" });
      return;
    }
    services.removeItem(cart, productId);
    res.json(cartJson(cart));
  }
);

router.post("/api/cart/:cartId/coupon", (req: Request, res: Response) => {
  const cartId = Number.parseInt(String(req.params.cartId), 10);
  const cart = Number.isNaN(cartId) ? undefined : carts.get(cartId);
  if (!cart) {
    res.status(404).json({ error: "cart not found" });
    return;
  }
  const code = String((req.body ?? {}).code ?? "").toUpperCase();
  if (!(code in COUPONS)) {
    res.status(400).json({ error: "invalid coupon" });
    return;
  }
  cart.coupon = code;
  res.json(cartJson(cart));
});

router.post("/api/cart/:cartId/checkout", (req: Request, res: Response) => {
  const cartId = Number.parseInt(String(req.params.cartId), 10);
  const cart = Number.isNaN(cartId) ? undefined : carts.get(cartId);
  if (!cart) {
    res.status(404).json({ error: "cart not found" });
    return;
  }
  const data = req.body ?? {};
  try {
    const order = services.checkout(
      cart,
      String(data.email ?? ""),
      String(data.card_token ?? "")
    );
    res.status(201).json({
      order_id: order.id,
      status: order.status,
      total: order.total,
    });
  } catch (err) {
    if (err instanceof services.CheckoutError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.get("/api/orders/:orderId", (req: Request, res: Response) => {
  const orderId = Number.parseInt(String(req.params.orderId), 10);
  const order = Number.isNaN(orderId) ? undefined : orders.get(orderId);
  const email = String(req.query.email ?? "").toLowerCase();
  if (!order || order.email.toLowerCase() !== email) {
    res.status(404).json({ error: "order not found" });
    return;
  }
  res.json({
    order_id: order.id,
    status: order.status,
    total: order.total,
  });
});

router.post("/api/chat", async (req: Request, res: Response) => {
  const data = req.body ?? {};
  const result = await chatAnswer(
    typeof data.message === "string" ? data.message : ""
  );
  res.json(result);
});

router.get("/", (_req: Request, res: Response) => {
  res.sendFile(PUBLIC_INDEX);
});
