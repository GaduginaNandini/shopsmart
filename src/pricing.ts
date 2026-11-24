/**
 * Pricing and discount rules (pure functions).
 *
 * Rules:
 *   R1  Bulk: 10 or more units of one product -> 5% off that line.
 *   R2  Coupon SAVE10 -> 10% off the subtotal after bulk discount.
 *   R3  Totals are rounded half-up to 2 decimals.
 */

export const BULK_THRESHOLD = 10;
export const BULK_RATE = 0.05;
export const COUPONS: Record<string, number> = { SAVE10: 0.1 };

export function toCents(value: string | number): number {
  const str = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(str)) {
    throw new Error(`Invalid monetary value: ${value}`);
  }
  const negative = str.startsWith("-");
  const unsigned = negative ? str.slice(1) : str;
  const [wholePart, fracPart = ""] = unsigned.split(".");
  const padded = (fracPart + "000").slice(0, 3);
  let cents = Number(wholePart) * 100 + Number(padded.slice(0, 2));
  if (Number(padded[2]) >= 5) {
    cents += 1;
  }
  return negative ? -cents : cents;
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function money(value: string | number): string {
  return formatCents(toCents(value));
}

export function lineTotalCents(unitPrice: string | number, quantity: number): number {
  if (quantity < 0) {
    throw new Error("quantity must be >= 0");
  }
  const raw = toCents(unitPrice) * quantity;
  if (quantity >= BULK_THRESHOLD) {
    const keepPct = Math.round((1 - BULK_RATE) * 100);
    return Math.floor((raw * keepPct + 50) / 100);
  }
  return raw;
}

export function lineTotal(unitPrice: string | number, quantity: number): string {
  return formatCents(lineTotalCents(unitPrice, quantity));
}

export function cartTotalCents(
  lines: Array<[string | number, number]>,
  coupon?: string | null
): number {
  let subtotal = 0;
  for (const [unitPrice, quantity] of lines) {
    subtotal += lineTotalCents(unitPrice, quantity);
  }
  if (coupon) {
    const rate = COUPONS[coupon.toUpperCase()];
    if (rate === undefined) {
      throw new Error("invalid coupon");
    }
    const keepPct = Math.round((1 - rate) * 100);
    subtotal = Math.floor((subtotal * keepPct + 50) / 100);
  }
  return subtotal;
}

export function cartTotal(
  lines: Array<[string | number, number]>,
  coupon?: string | null
): string {
  return formatCents(cartTotalCents(lines, coupon));
}
