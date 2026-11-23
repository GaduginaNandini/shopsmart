from decimal import Decimal

import pytest

from app.pricing import cart_total, line_total


def test_line_total_no_discount():
    assert line_total("10.00", 3) == Decimal("30.00")


def test_bulk_discount_at_threshold():
    assert line_total("10.00", 10) == Decimal("95.00")


def test_negative_quantity_rejected():
    with pytest.raises(ValueError):
        line_total("10.00", -1)


def test_coupon_applies_after_bulk():
    assert cart_total([("10.00", 10)], "save10") == Decimal("85.50")


def test_invalid_coupon():
    with pytest.raises(ValueError):
        cart_total([("10.00", 1)], "FAKE")


def test_empty_cart_total_zero():
    assert cart_total([]) == Decimal("0.00")
