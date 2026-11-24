import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router, type NextFunction, type Request, type Response } from "express";
import { answer as chatAnswer } from "./chatbot/service.ts";
import * as repo from "./db/repository.ts";
import { AppError, DatabaseError } from "./db/repository.ts";
import { signSessionToken } from "./lib/session.ts";
import {
  authenticateOptional,
  requireAdmin,
  requireAuth,
  type AuthRequest,
} from "./middleware/auth.ts";
import { bump, metrics } from "./services.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_INDEX = path.resolve(__dirname, "..", "public", "index.html");

export const router = Router();

function handleError(res: Response, err: unknown, next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.message.includes("insufficient stock") || err.message === "payment declined") {
      bump("orders_failed");
    }
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof DatabaseError) {
    res.status(503).json({ error: err.message });
    return;
  }
  next(err);
}

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

router.get("/metrics", (_req: Request, res: Response) => {
  const n = Math.max(metrics.requests, 1);
  const lines = [
    `shopsmart_requests_total ${metrics.requests}`,
    `shopsmart_errors_total ${metrics.errors}`,
    `shopsmart_orders_ok_total ${metrics.orders_ok}`,
    `shopsmart_orders_failed_total ${metrics.orders_failed}`,
    `shopsmart_response_seconds_avg ${(metrics.latency_sum / n).toFixed(6)}`,
  ];
  res
    .status(200)
    .set("Content-Type", "text/plain; version=0.0.4")
    .send(lines.join("\n") + "\n");
});

// --- Auth Routes ---

router.get("/api/auth/status", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const hasAdmin = await repo.hasAnyAdmin();
    res.json({ hasAdmin });
  } catch (err) {
    handleError(res, err, next);
  }
});

router.post("/api/auth/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    const user = await repo.registerLocalUser(
      String(body.name ?? ""),
      String(body.email ?? ""),
      String(body.password ?? "")
    );
    const token = signSessionToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    handleError(res, err, next);
  }
});

router.post("/api/auth/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    const user = await repo.authenticateLocalUser(
      String(body.email ?? ""),
      String(body.password ?? "")
    );
    const token = signSessionToken(user);
    res.json({ user, token });
  } catch (err) {
    handleError(res, err, next);
  }
});

router.post("/api/auth/firebase", requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.authUser });
});

router.post("/api/auth/claim-admin", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await repo.claimFirstAdminForUser(req.authUser!.id);
    const token = signSessionToken(updated);
    res.json({ user: updated, token });
  } catch (err) {
    handleError(res, err, next);
  }
});

router.get("/api/auth/me", requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.authUser });
});

// --- Products Routes ---

router.get("/api/products", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const category =
      typeof req.query.category === "string" ? req.query.category : undefined;
    const list = await repo.listProducts({ q, category });
    res.json(list);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.get("/api/products/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "invalid product id" });
      return;
    }
    const product = await repo.getProductById(id);
    if (!product) {
      res.status(404).json({ error: "product not found" });
      return;
    }
    res.json(product);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.post("/api/products", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    const product = await repo.createProduct({
      name: String(body.name ?? ""),
      description: typeof body.description === "string" ? body.description : "",
      category: typeof body.category === "string" ? body.category : "General",
      price: body.price,
      stock: body.stock,
    });
    res.status(201).json(product);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.patch("/api/products/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "invalid product id" });
      return;
    }
    const body = req.body ?? {};
    const updated = await repo.updateProduct(id, {
      name: body.name !== undefined ? String(body.name) : undefined,
      description:
        body.description !== undefined ? String(body.description) : undefined,
      category: body.category !== undefined ? String(body.category) : undefined,
      price: body.price,
      stock: body.stock,
    });
    res.json(updated);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.delete("/api/products/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "invalid product id" });
      return;
    }
    await repo.deleteProduct(id);
    res.status(204).send();
  } catch (err) {
    handleError(res, err, next);
  }
});

// --- Cart & Checkout Routes ---

router.post("/api/cart", authenticateOptional, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cart = await repo.createCart(req.authUser?.id ?? null);
    res.status(201).json(cart);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.get("/api/cart/:cartId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cartId = Number.parseInt(String(req.params.cartId), 10);
    if (Number.isNaN(cartId)) {
      res.status(404).json({ error: "cart not found" });
      return;
    }
    const cart = await repo.getCart(cartId);
    if (!cart) {
      res.status(404).json({ error: "cart not found" });
      return;
    }
    res.json(cart);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.post("/api/cart/:cartId/items", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cartId = Number.parseInt(String(req.params.cartId), 10);
    if (Number.isNaN(cartId)) {
      res.status(404).json({ error: "cart not found" });
      return;
    }
    const body = req.body ?? {};
    const productId = Number.parseInt(String(body.product_id), 10);
    const quantity = Number.parseInt(String(body.quantity ?? 1), 10);
    const cart = await repo.addItemToCart(cartId, productId, quantity);
    res.json(cart);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.patch("/api/cart/:cartId/items/:productId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cartId = Number.parseInt(String(req.params.cartId), 10);
    const productId = Number.parseInt(String(req.params.productId), 10);
    if (Number.isNaN(cartId) || Number.isNaN(productId)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const quantity = Number.parseInt(String((req.body ?? {}).quantity), 10);
    const cart = await repo.updateCartItemQty(cartId, productId, quantity);
    res.json(cart);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.delete("/api/cart/:cartId/items/:productId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cartId = Number.parseInt(String(req.params.cartId), 10);
    const productId = Number.parseInt(String(req.params.productId), 10);
    if (Number.isNaN(cartId) || Number.isNaN(productId)) {
      res.status(404).json({ error: "cart not found" });
      return;
    }
    const cart = await repo.removeItemFromCart(cartId, productId);
    res.json(cart);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.post("/api/cart/:cartId/coupon", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cartId = Number.parseInt(String(req.params.cartId), 10);
    if (Number.isNaN(cartId)) {
      res.status(404).json({ error: "cart not found" });
      return;
    }
    const code = String((req.body ?? {}).code ?? "");
    const cart = await repo.applyCouponToCart(cartId, code);
    res.json(cart);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.post("/api/cart/:cartId/checkout", authenticateOptional, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cartId = Number.parseInt(String(req.params.cartId), 10);
    if (Number.isNaN(cartId)) {
      res.status(404).json({ error: "cart not found" });
      return;
    }
    const body = req.body ?? {};
    const email = String(body.email || req.authUser?.email || "");
    const cardToken = String(body.card_token ?? "");
    const order = await repo.checkoutCart(
      cartId,
      email,
      cardToken,
      req.authUser?.id ?? null
    );
    bump("orders_ok");
    res.status(201).json({
      order_id: order.id,
      status: order.status,
      total: order.total,
      payment_ref: order.paymentRef,
    });
  } catch (err) {
    handleError(res, err, next);
  }
});

// --- Orders Routes ---

router.get("/api/orders", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.authUser!;
    const list = await repo.listOrders({
      userId: user.id,
      email: user.email,
      isAdmin: user.role === "admin",
    });
    res.json(list);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.get("/api/orders/:orderId", authenticateOptional, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orderId = Number.parseInt(String(req.params.orderId), 10);
    if (Number.isNaN(orderId)) {
      res.status(404).json({ error: "order not found" });
      return;
    }
    const order = await repo.getOrderById(orderId);
    const queryEmail = String(req.query.email ?? "").toLowerCase();
    const user = req.authUser;
    const isOwner =
      Boolean(user) &&
      (user!.role === "admin" ||
        user!.id === order?.userId ||
        user!.email.toLowerCase() === order?.email.toLowerCase());
    const emailMatches = Boolean(queryEmail) && order?.email.toLowerCase() === queryEmail;

    if (!order || (!isOwner && !emailMatches)) {
      res.status(404).json({ error: "order not found" });
      return;
    }

    res.json({
      order_id: order.id,
      status: order.status,
      total: order.total,
      email: order.email,
      payment_ref: order.paymentRef,
      created_at: order.createdAt,
      items: order.items,
    });
  } catch (err) {
    handleError(res, err, next);
  }
});

router.patch("/api/orders/:orderId/status", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number.parseInt(String(req.params.orderId), 10);
    if (Number.isNaN(orderId)) {
      res.status(400).json({ error: "invalid order id" });
      return;
    }
    const status = String((req.body ?? {}).status ?? "");
    const updated = await repo.updateOrderStatus(orderId, status);
    res.json(updated);
  } catch (err) {
    handleError(res, err, next);
  }
});

// --- Support Chatbot & Escalation Tickets ---

router.post("/api/chat", authenticateOptional, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    const result = await chatAnswer(
      typeof body.message === "string" ? body.message : "",
      {
        authenticatedEmail: req.authUser?.email ?? null,
      }
    );
    res.json(result);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.get("/api/support/tickets", requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tickets = await repo.listSupportTickets();
    res.json(tickets);
  } catch (err) {
    handleError(res, err, next);
  }
});

router.get("/", (_req: Request, res: Response) => {
  res.sendFile(PUBLIC_INDEX);
});
