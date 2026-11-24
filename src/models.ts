/**
 * In-memory data models: Product, Cart, CartItem, Order, OrderItem.
 * Replaces SQLAlchemy/PostgreSQL/SQLite for the AI Studio Node.js runtime.
 */

export interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
}

export interface CartItem {
  id: number;
  cart_id: number;
  product_id: number;
  quantity: number;
}

export interface Cart {
  id: number;
  coupon: string | null;
  items: CartItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: string;
}

export type OrderStatus = "PAID" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export interface Order {
  id: number;
  email: string;
  status: OrderStatus;
  total: string;
  created_at: Date;
  items: OrderItem[];
}

export const products = new Map<number, Product>();
export const carts = new Map<number, Cart>();
export const orders = new Map<number, Order>();

let nextProductId = 1;
let nextCartId = 1;
let nextCartItemId = 1;
let nextOrderId = 1;
let nextOrderItemId = 1;

export function allocateProductId(): number {
  return nextProductId++;
}

export function allocateCartId(): number {
  return nextCartId++;
}

export function allocateCartItemId(): number {
  return nextCartItemId++;
}

export function allocateOrderId(): number {
  return nextOrderId++;
}

export function allocateOrderItemId(): number {
  return nextOrderItemId++;
}

export function seedProducts(): void {
  if (products.size > 0) return;
  const initial: Array<Omit<Product, "id">> = [
    { name: "Notebook", price: "50.00", stock: 100 },
    { name: "Pen Set", price: "120.00", stock: 40 },
    { name: "Desk Lamp", price: "799.00", stock: 15 },
    { name: "Backpack", price: "1499.00", stock: 8 },
  ];
  for (const item of initial) {
    const id = allocateProductId();
    products.set(id, { id, ...item });
  }
}
