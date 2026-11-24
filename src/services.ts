/**
 * Cart, checkout, and metrics services. Payment is mocked.
 */
import {
  allocateCartId,
  allocateCartItemId,
  allocateOrderId,
  allocateOrderItemId,
  carts,
  orders,
  products,
  type Cart,
  type Order,
} from "./models.ts";
import { cartTotal } from "./pricing.ts";

export const metrics = {
  requests: 0,
  errors: 0,
  orders_ok: 0,
  orders_failed: 0,
  latency_sum: 0.0,
};

export function bump(key: keyof typeof metrics, amount = 1): void {
  metrics[key] += amount;
}

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

export function getOrCreateCart(cartId?: number | null): Cart {
  if (cartId !== undefined && cartId !== null) {
    const existing = carts.get(cartId);
    if (existing) return existing;
  }
  const cart: Cart = { id: allocateCartId(), coupon: null, items: [] };
  carts.set(cart.id, cart);
  return cart;
}

export function addItem(cart: Cart, productId: number, quantity = 1): Cart {
  if (quantity < 1) {
    throw new CheckoutError("quantity must be at least 1");
  }
  const product = products.get(productId);
  if (!product) {
    throw new CheckoutError("product not found");
  }
  const existing = cart.items.find((i) => i.product_id === productId);
  const newQty = (existing ? existing.quantity : 0) + quantity;
  if (newQty > product.stock) {
    throw new CheckoutError("insufficient stock");
  }
  if (existing) {
    existing.quantity = newQty;
  } else {
    cart.items.push({
      id: allocateCartItemId(),
      cart_id: cart.id,
      product_id: productId,
      quantity,
    });
  }
  return cart;
}

export function removeItem(cart: Cart, productId: number): Cart {
  cart.items = cart.items.filter((i) => i.product_id !== productId);
  return cart;
}

export function totalFor(cart: Cart): string {
  const lines: Array<[string, number]> = cart.items.map((item) => {
    const product = products.get(item.product_id);
    if (!product) {
      throw new CheckoutError("product not found");
    }
    return [product.price, item.quantity];
  });
  return cartTotal(lines, cart.coupon);
}

export function mockPayment(cardToken: string): boolean {
  return cardToken !== "tok_fail";
}

export function checkout(cart: Cart, email: string, cardToken: string): Order {
  if (cart.items.length === 0) {
    throw new CheckoutError("cart is empty");
  }
  if (!email || !email.includes("@")) {
    throw new CheckoutError("valid email required");
  }

  for (const item of cart.items) {
    const product = products.get(item.product_id);
    if (!product || item.quantity > product.stock) {
      bump("orders_failed");
      throw new CheckoutError(
        `insufficient stock for ${product ? product.name : "product"}`
      );
    }
  }

  const total = totalFor(cart);
  if (!mockPayment(cardToken)) {
    bump("orders_failed");
    throw new CheckoutError("payment declined");
  }

  const orderId = allocateOrderId();
  const order: Order = {
    id: orderId,
    email,
    status: "PAID",
    total,
    created_at: new Date(),
    items: [],
  };

  for (const item of cart.items) {
    const product = products.get(item.product_id)!;
    product.stock -= item.quantity;
    order.items.push({
      id: allocateOrderItemId(),
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: product.price,
    });
  }

  orders.set(orderId, order);
  cart.items = [];
  cart.coupon = null;
  bump("orders_ok");
  return order;
}
