import crypto from "node:crypto";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "./index.ts";
import {
  cartItems,
  carts,
  orderItems,
  orders,
  products,
  supportTickets,
  users,
} from "./schema.ts";
import { hashPassword, verifyPassword } from "../lib/session.ts";
import { cartTotal, COUPONS, money } from "../pricing.ts";

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export class DatabaseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "DatabaseError";
  }
}

export const ORDER_STATUSES = [
  "PAID",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface PublicUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string;
}

function toPublicUser(row: typeof users.$inferSelect): PublicUser {
  return {
    id: row.id,
    uid: row.uid,
    email: row.email,
    name: row.name,
    role: row.role,
  };
}

// --- Users & Auth ---

export async function getUserById(id: number): Promise<PublicUser | null> {
  try {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toPublicUser(row) : null;
  } catch (err) {
    console.error("Failed to fetch user by id:", err);
    throw new DatabaseError("Failed to retrieve user profile.", err);
  }
}

export async function getOrCreateFirebaseUser(
  uid: string,
  email: string,
  name: string
): Promise<PublicUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name.trim() || normalizedEmail.split("@")[0];
  try {
    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingByEmail && existingByEmail.uid !== uid) {
      const [updated] = await db
        .update(users)
        .set({ uid, name: displayName })
        .where(eq(users.id, existingByEmail.id))
        .returning();
      return toPublicUser(updated);
    }

    const [upserted] = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        name: displayName,
        role: "customer",
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: normalizedEmail, name: displayName },
      })
      .returning();

    return toPublicUser(upserted);
  } catch (err) {
    console.error("Failed to sync Firebase user:", err);
    throw new DatabaseError("Failed to synchronize user account.", err);
  }
}

export async function registerLocalUser(
  name: string,
  email: string,
  password: string
): Promise<PublicUser> {
  const cleanName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!cleanName) throw new AppError("Name is required.", 400);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new AppError("Valid email is required.", 400);
  }
  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters.", 400);
  }

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      throw new AppError("An account with this email already exists.", 409);
    }

    const [created] = await db
      .insert(users)
      .values({
        uid: `local:${crypto.randomUUID()}`,
        email: normalizedEmail,
        name: cleanName,
        passwordHash: hashPassword(password),
        role: "customer",
      })
      .returning();

    return toPublicUser(created);
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("Failed to register user:", err);
    throw new DatabaseError("Registration failed. Please try again.", err);
  }
}

export async function authenticateLocalUser(
  email: string,
  password: string
): Promise<PublicUser> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new AppError("Email and password are required.", 400);
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      throw new AppError("Invalid email or password.", 401);
    }

    return toPublicUser(user);
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("Failed to authenticate user:", err);
    throw new DatabaseError("Authentication failed. Please try again.", err);
  }
}

export async function hasAnyAdmin(): Promise<boolean> {
  try {
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    return Boolean(admin);
  } catch (err) {
    console.error("Failed to check admin status:", err);
    throw new DatabaseError("Failed to verify admin status.", err);
  }
}

export async function claimFirstAdminForUser(userId: number): Promise<PublicUser> {
  try {
    return await db.transaction(async (tx) => {
      const [existingAdmin] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);
      if (existingAdmin) {
        throw new AppError("An admin account has already been configured.", 403);
      }
      const [updated] = await tx
        .update(users)
        .set({ role: "admin" })
        .where(eq(users.id, userId))
        .returning();
      if (!updated) {
        throw new AppError("User account not found.", 404);
      }
      return toPublicUser(updated);
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("Failed to claim admin role:", err);
    throw new DatabaseError("Failed to claim admin access.", err);
  }
}

// --- Products ---

async function ensureDefaultProductsSeeded(): Promise<void> {
  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length > 0) return;

  await db.insert(products).values([
    {
      name: "Notebook",
      description: "Hardcover A5 ruled notebook, 200 pages",
      category: "Stationery",
      price: "50.00",
      stock: 100,
    },
    {
      name: "Pen Set",
      description: "Smooth gel pen set (pack of 5)",
      category: "Stationery",
      price: "120.00",
      stock: 40,
    },
    {
      name: "Desk Lamp",
      description: "Adjustable LED study desk lamp with USB power",
      category: "Electronics",
      price: "799.00",
      stock: 15,
    },
    {
      name: "Backpack",
      description: "Water-resistant 25L laptop backpack",
      category: "Accessories",
      price: "1499.00",
      stock: 8,
    },
  ]);
}

export async function listProducts(filters?: {
  q?: string;
  category?: string;
}) {
  try {
    await ensureDefaultProductsSeeded();

    const conditions = [];
    if (filters?.q?.trim()) {
      const pattern = `%${filters.q.trim()}%`;
      conditions.push(
        or(ilike(products.name, pattern), ilike(products.description, pattern))
      );
    }
    if (filters?.category?.trim() && filters.category !== "All") {
      conditions.push(eq(products.category, filters.category.trim()));
    }

    const query =
      conditions.length > 0
        ? db
            .select()
            .from(products)
            .where(and(...conditions))
            .orderBy(asc(products.id))
        : db.select().from(products).orderBy(asc(products.id));

    return await query;
  } catch (err) {
    console.error("Failed to list products:", err);
    throw new DatabaseError("Failed to load product catalogue.", err);
  }
}

export async function getProductById(productId: number) {
  try {
    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    return row ?? null;
  } catch (err) {
    console.error("Failed to get product:", err);
    throw new DatabaseError("Failed to retrieve product.", err);
  }
}

export async function createProduct(input: {
  name: string;
  description?: string;
  category?: string;
  price: string | number;
  stock?: number;
}) {
  const name = input.name?.trim();
  const priceNum = Number(input.price ?? -1);
  const stockNum = Number.parseInt(String(input.stock ?? 0), 10);
  if (!name || Number.isNaN(priceNum) || priceNum < 0) {
    throw new AppError("name and non-negative price required", 400);
  }
  if (Number.isNaN(stockNum) || stockNum < 0) {
    throw new AppError("stock must be a non-negative integer", 400);
  }

  try {
    const [created] = await db
      .insert(products)
      .values({
        name,
        description: (input.description ?? "").trim(),
        category: (input.category ?? "General").trim() || "General",
        price: money(priceNum),
        stock: stockNum,
      })
      .returning();
    return created;
  } catch (err) {
    console.error("Failed to create product:", err);
    throw new DatabaseError("Failed to create product.", err);
  }
}

export async function updateProduct(
  productId: number,
  input: {
    name?: string;
    description?: string;
    category?: string;
    price?: string | number;
    stock?: number;
  }
) {
  const updates: Partial<typeof products.$inferInsert> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new AppError("Product name cannot be empty.", 400);
    updates.name = name;
  }
  if (input.description !== undefined) {
    updates.description = input.description.trim();
  }
  if (input.category !== undefined) {
    updates.category = input.category.trim() || "General";
  }
  if (input.price !== undefined) {
    const priceNum = Number(input.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      throw new AppError("Price must be non-negative.", 400);
    }
    updates.price = money(priceNum);
  }
  if (input.stock !== undefined) {
    const stockNum = Number.parseInt(String(input.stock), 10);
    if (Number.isNaN(stockNum) || stockNum < 0) {
      throw new AppError("Stock must be a non-negative integer.", 400);
    }
    updates.stock = stockNum;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("No fields provided to update.", 400);
  }

  try {
    const [updated] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, productId))
      .returning();
    if (!updated) throw new AppError("Product not found.", 404);
    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("Failed to update product:", err);
    throw new DatabaseError("Failed to update product.", err);
  }
}

export async function deleteProduct(productId: number): Promise<void> {
  try {
    const [usedInOrder] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.productId, productId))
      .limit(1);
    if (usedInOrder) {
      throw new AppError(
        "Cannot delete product that appears in existing orders; set stock to 0 instead.",
        409
      );
    }

    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, productId))
      .returning();
    if (!deleted) throw new AppError("Product not found.", 404);
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("Failed to delete product:", err);
    throw new DatabaseError("Failed to delete product.", err);
  }
}

// --- Carts & Checkout ---

export interface CartView {
  cart_id: number;
  coupon: string | null;
  items: Array<{
    product_id: number;
    name: string;
    quantity: number;
    unit_price: string;
  }>;
  total: string;
}

async function buildCartView(cartId: number): Promise<CartView | null> {
  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.id, cartId))
    .limit(1);
  if (!cart) return null;

  const rows = await db
    .select({
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      name: products.name,
      price: products.price,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.id));

  const total = cartTotal(
    rows.map((r) => [r.price, r.quantity]),
    cart.coupon
  );

  return {
    cart_id: cart.id,
    coupon: cart.coupon,
    items: rows.map((r) => ({
      product_id: r.productId,
      name: r.name,
      quantity: r.quantity,
      unit_price: r.price,
    })),
    total,
  };
}

export async function createCart(userId?: number | null): Promise<CartView> {
  try {
    const [cart] = await db
      .insert(carts)
      .values({ userId: userId ?? null, coupon: null })
      .returning();
    return { cart_id: cart.id, coupon: null, items: [], total: "0.00" };
  } catch (err) {
    console.error("Failed to create cart:", err);
    throw new DatabaseError("Failed to create shopping cart.", err);
  }
}

export async function getCart(cartId: number): Promise<CartView | null> {
  try {
    return await buildCartView(cartId);
  } catch (err) {
    console.error("Failed to fetch cart:", err);
    throw new DatabaseError("Failed to load shopping cart.", err);
  }
}

export async function addItemToCart(
  cartId: number,
  productId: number,
  quantity = 1
): Promise<CartView> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError("quantity must be at least 1", 400);
  }

  try {
    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.id, cartId))
      .limit(1);
    if (!cart) throw new AppError("cart not found", 404);

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!product) throw new AppError("product not found", 400);

    const [existing] = await db
      .select()
      .from(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId))
      )
      .limit(1);

    const newQty = (existing ? existing.quantity : 0) + quantity;
    if (newQty > product.stock) {
      throw new AppError("insufficient stock", 400);
    }

    if (existing) {
      await db
        .update(cartItems)
        .set({ quantity: newQty })
        .where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({
        cartId,
        productId,
        quantity,
      });
    }

    return (await buildCartView(cartId))!;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("Failed to add item to cart:", err);
    throw new DatabaseError("Failed to update shopping cart.", err);
  }
}

export async function updateCartItemQty(
  cartId: number,
  productId: number,
  quantity: number
): Promise<CartView> {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new AppError("quantity must be a non-negative integer", 400);
  }
  try {
    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.id, cartId))
      .limit(1);
    if (!cart) throw new AppError("cart not found", 404);

    if (quantity === 0) {
      await db
        .delete(cartItems)
        .where(
          and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId))
        );
      return (await buildCartView(cartId))!;
    }

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!product) throw new AppError("product not found", 404);
    if (quantity > product.stock) {
      throw new AppError("insufficient stock", 400);
    }

    await db
      .update(cartItems)
      .set({ quantity })
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId))
      );

    return (await buildCartView(cartId))!;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("Failed to update cart item quantity:", err);
    throw new DatabaseError("Failed to update item quantity.", err);
  }
}

export async function removeItemFromCart(
  cartId: number,
  productId: number
): Promise<CartView> {
  try {
    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.id, cartId))
      .limit(1);
    if (!cart) throw new AppError("cart not found", 404);

    await db
      .delete(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId))
      );

    return (await buildCartView(cartId))!;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("Failed to remove cart item:", err);
    throw new DatabaseError("Failed to remove item from cart.", err);
  }
}

export async function applyCouponToCart(
  cartId: number,
  rawCode: string
): Promise<CartView> {
  const code = rawCode.trim().toUpperCase();
  if (!(code in COUPONS)) {
    throw new AppError("invalid coupon", 400);
  }
  try {
    const [updated] = await db
      .update(carts)
      .set({ coupon: code })
      .where(eq(carts.id, cartId))
      .returning();
    if (!updated) throw new AppError("cart not found", 404);
    return (await buildCartView(cartId))!;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("Failed to apply coupon:", err);
    throw new DatabaseError("Failed to apply coupon.", err);
  }
}

export function mockPayment(cardToken: string): {
  approved: boolean;
  paymentRef: string;
} {
  if (cardToken === "tok_fail") {
    return { approved: false, paymentRef: "" };
  }
  return {
    approved: true,
    paymentRef: `pay_${crypto.randomBytes(6).toString("hex")}`,
  };
}

export async function checkoutCart(
  cartId: number,
  email: string,
  cardToken: string,
  userId?: number | null
) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new AppError("valid email required", 400);
  }

  try {
    return await db.transaction(async (tx) => {
      const [cart] = await tx
        .select()
        .from(carts)
        .where(eq(carts.id, cartId))
        .limit(1);
      if (!cart) throw new AppError("cart not found", 404);

      const items = await tx
        .select({
          id: cartItems.id,
          productId: cartItems.productId,
          quantity: cartItems.quantity,
          name: products.name,
          price: products.price,
          stock: products.stock,
        })
        .from(cartItems)
        .innerJoin(products, eq(cartItems.productId, products.id))
        .where(eq(cartItems.cartId, cartId));

      if (items.length === 0) {
        throw new AppError("cart is empty", 400);
      }

      const payment = mockPayment(cardToken);
      if (!payment.approved) {
        throw new AppError("payment declined", 400);
      }

      for (const item of items) {
        const updatedProducts = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}` })
          .where(
            and(
              eq(products.id, item.productId),
              sql`${products.stock} >= ${item.quantity}`
            )
          )
          .returning();

        if (updatedProducts.length === 0) {
          throw new AppError(`insufficient stock for ${item.name}`, 400);
        }
      }

      const total = cartTotal(
        items.map((i) => [i.price, i.quantity]),
        cart.coupon
      );

      const [order] = await tx
        .insert(orders)
        .values({
          userId: userId ?? cart.userId ?? null,
          email: cleanEmail,
          status: "PAID",
          total,
          coupon: cart.coupon,
          paymentRef: payment.paymentRef,
        })
        .returning();

      await tx.insert(orderItems).values(
        items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
        }))
      );

      await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));
      await tx.update(carts).set({ coupon: null }).where(eq(carts.id, cartId));

      return order;
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("Checkout transaction failed:", err);
    throw new DatabaseError("Checkout failed. Please try again.", err);
  }
}

// --- Orders ---

export async function getOrderById(orderId: number) {
  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) return null;

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.id));

    return { ...order, items };
  } catch (err) {
    console.error("Failed to fetch order:", err);
    throw new DatabaseError("Failed to retrieve order.", err);
  }
}

export async function listOrders(options: {
  userId?: number;
  email?: string;
  isAdmin?: boolean;
}) {
  try {
    let orderRows: Array<typeof orders.$inferSelect>;
    if (options.isAdmin) {
      orderRows = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt), desc(orders.id));
    } else if (options.userId && options.email) {
      orderRows = await db
        .select()
        .from(orders)
        .where(
          or(
            eq(orders.userId, options.userId),
            eq(orders.email, options.email.toLowerCase())
          )
        )
        .orderBy(desc(orders.createdAt), desc(orders.id));
    } else {
      return [];
    }

    const enriched = await Promise.all(
      orderRows.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id))
          .orderBy(asc(orderItems.id));
        return { ...order, items };
      })
    );
    return enriched;
  } catch (err) {
    console.error("Failed to list orders:", err);
    throw new DatabaseError("Failed to retrieve order history.", err);
  }
}

export async function updateOrderStatus(orderId: number, status: string) {
  const upper = status.trim().toUpperCase() as OrderStatus;
  if (!ORDER_STATUSES.includes(upper)) {
    throw new AppError(
      `Invalid status. Must be one of: ${ORDER_STATUSES.join(", ")}`,
      400
    );
  }

  try {
    const [updated] = await db
      .update(orders)
      .set({ status: upper })
      .where(eq(orders.id, orderId))
      .returning();
    if (!updated) throw new AppError("order not found", 404);
    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("Failed to update order status:", err);
    throw new DatabaseError("Failed to update order status.", err);
  }
}

// --- Support Tickets ---

export async function createSupportTicket(
  question: string,
  email?: string | null
) {
  try {
    const [ticket] = await db
      .insert(supportTickets)
      .values({
        question,
        email: email ?? null,
        status: "OPEN",
      })
      .returning();
    return ticket;
  } catch (err) {
    console.error("Failed to create support ticket:", err);
    return null;
  }
}

export async function listSupportTickets() {
  try {
    return await db
      .select()
      .from(supportTickets)
      .orderBy(desc(supportTickets.createdAt), desc(supportTickets.id));
  } catch (err) {
    console.error("Failed to list support tickets:", err);
    throw new DatabaseError("Failed to retrieve support tickets.", err);
  }
}
