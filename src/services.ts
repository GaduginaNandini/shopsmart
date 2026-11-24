/**
 * Application metrics & checkout error exports for compatibility.
 */

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
