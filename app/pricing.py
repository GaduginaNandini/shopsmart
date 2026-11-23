"""Pricing and discount rules (pure functions, easy to unit-test).

Rules (SRS draft):
  R1  Bulk: 10 or more units of one product -> 5% off that line.
  R2  Coupon SAVE10 -> 10% off the subtotal after bulk discount.
  R3  Totals are rounded half-up to 2 decimals.
"""
from decimal import ROUND_HALF_UP, Decimal

BULK_THRESHOLD = 10
BULK_RATE = Decimal("0.05")
COUPONS = {"SAVE10": Decimal("0.10")}
CENT = Decimal("0.01")


def money(value):
    """Round a value to 2 decimals, half-up."""
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def line_total(unit_price, quantity):
    """Price of one cart line; 5% bulk discount from 10 units (rule R1)."""
    if quantity < 0:
        raise ValueError("quantity must be >= 0")
    total = Decimal(unit_price) * quantity
    if quantity >= BULK_THRESHOLD:
        total -= total * BULK_RATE
    return money(total)


def cart_total(lines, coupon=None):
    """lines: iterable of (unit_price, quantity). Returns Decimal."""
    subtotal = sum((line_total(p, q) for p, q in lines), Decimal("0"))
    if coupon:
        rate = COUPONS.get(coupon.upper())
        if rate is None:
            raise ValueError("invalid coupon")
        subtotal -= subtotal * rate
    return money(subtotal)
