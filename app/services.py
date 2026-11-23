"""Cart and checkout services. Payment is mocked."""
from . import bump
from .models import Cart, CartItem, Order, OrderItem, Product, db
from .pricing import cart_total


class CheckoutError(Exception):
    """Raised for any business-rule failure during cart or checkout."""


def get_or_create_cart(cart_id=None):
    """Load a cart by id or create a new one."""
    cart = db.session.get(Cart, cart_id) if cart_id else None
    if cart is None:
        cart = Cart()
        db.session.add(cart)
        db.session.commit()
    return cart


def add_item(cart, product_id, quantity=1):
    """Add item."""
    if quantity < 1:
        raise CheckoutError("quantity must be at least 1")
    product = db.session.get(Product, product_id)
    if product is None:
        raise CheckoutError("product not found")
    existing = next((i for i in cart.items if i.product_id == product_id), None)
    new_qty = (existing.quantity if existing else 0) + quantity
    if new_qty > product.stock:
        raise CheckoutError("insufficient stock")
    if existing:
        existing.quantity = new_qty
    else:
        cart.items.append(CartItem(product_id=product_id, quantity=quantity))
    db.session.commit()
    return cart


def remove_item(cart, product_id):
    """Remove item."""
    for item in list(cart.items):
        if item.product_id == product_id:
            cart.items.remove(item)
    db.session.commit()
    return cart


def total_for(cart):
    """Total for."""
    return cart_total([(i.product.price, i.quantity) for i in cart.items], cart.coupon)


def mock_payment(card_token):
    """Mock gateway: token 'tok_fail' is declined, everything else approved."""
    return card_token != "tok_fail"  # nosec B105 - mock decline token, not a credential


def checkout(cart, email, card_token):
    """Checkout."""
    if not cart.items:
        raise CheckoutError("cart is empty")
    if not email or "@" not in email:
        raise CheckoutError("valid email required")
    for item in cart.items:  # lock rows so concurrent checkouts cannot oversell
        db.session.get(Product, item.product_id, with_for_update=True)
        db.session.refresh(item.product)
        if item.quantity > item.product.stock:
            bump("orders_failed")
            raise CheckoutError(f"insufficient stock for {item.product.name}")
    total = total_for(cart)
    if not mock_payment(card_token):
        bump("orders_failed")
        raise CheckoutError("payment declined")
    order = Order(email=email, total=total, status="PAID")
    for item in cart.items:
        item.product.stock -= item.quantity
        order.items.append(
            OrderItem(product_id=item.product_id, quantity=item.quantity, unit_price=item.product.price)
        )
    db.session.add(order)
    for item in list(cart.items):
        cart.items.remove(item)
    cart.coupon = None
    db.session.commit()
    bump("orders_ok")
    return order
