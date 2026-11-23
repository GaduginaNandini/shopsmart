"""HTTP routes: catalogue, cart, checkout, orders."""
import hmac
import os

from flask import Blueprint, jsonify, render_template, request

from . import services
from .models import Order, Product, db

bp = Blueprint("shop", __name__)


def _cart_json(cart):
    return {
        "cart_id": cart.id,
        "coupon": cart.coupon,
        "items": [
            {"product_id": i.product_id, "name": i.product.name, "quantity": i.quantity,
             "unit_price": str(i.product.price)}
            for i in cart.items
        ],
        "total": str(services.total_for(cart)),
    }


@bp.get("/api/products")
def list_products():
    """List products."""
    return jsonify([p.to_dict() for p in Product.query.order_by(Product.id).all()])


def _owner_ok():
    """Owner actions need the X-Owner-Token header (env OWNER_TOKEN; dev default shown in README)."""
    expected = os.getenv("OWNER_TOKEN", "owner-dev-token")
    return hmac.compare_digest(request.headers.get("X-Owner-Token", ""), expected)


@bp.post("/api/products")
def create_product():
    """Create product."""
    if not _owner_ok():
        return jsonify(error="owner token required"), 403
    data = request.get_json(force=True)
    if not data.get("name") or float(data.get("price", -1)) < 0:
        return jsonify(error="name and non-negative price required"), 400
    p = Product(name=data["name"], price=data["price"], stock=int(data.get("stock", 0)))
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@bp.post("/api/cart")
def new_cart():
    """New cart."""
    return jsonify(_cart_json(services.get_or_create_cart())), 201


@bp.get("/api/cart/<int:cart_id>")
def get_cart(cart_id):
    """Get cart."""
    cart = db.session.get(services.Cart, cart_id)
    if cart is None:
        return jsonify(error="cart not found"), 404
    return jsonify(_cart_json(cart))


@bp.post("/api/cart/<int:cart_id>/items")
def add_to_cart(cart_id):
    """Add to cart."""
    cart = db.session.get(services.Cart, cart_id)
    if cart is None:
        return jsonify(error="cart not found"), 404
    data = request.get_json(force=True)
    try:
        services.add_item(cart, int(data["product_id"]), int(data.get("quantity", 1)))
    except services.CheckoutError as e:
        return jsonify(error=str(e)), 400
    return jsonify(_cart_json(cart))


@bp.delete("/api/cart/<int:cart_id>/items/<int:product_id>")
def remove_from_cart(cart_id, product_id):
    """Remove from cart."""
    cart = db.session.get(services.Cart, cart_id)
    if cart is None:
        return jsonify(error="cart not found"), 404
    services.remove_item(cart, product_id)
    return jsonify(_cart_json(cart))


@bp.post("/api/cart/<int:cart_id>/coupon")
def apply_coupon(cart_id):
    """Apply coupon."""
    cart = db.session.get(services.Cart, cart_id)
    if cart is None:
        return jsonify(error="cart not found"), 404
    code = request.get_json(force=True).get("code", "")
    from .pricing import COUPONS
    if code.upper() not in COUPONS:
        return jsonify(error="invalid coupon"), 400
    cart.coupon = code.upper()
    db.session.commit()
    return jsonify(_cart_json(cart))


@bp.post("/api/cart/<int:cart_id>/checkout")
def do_checkout(cart_id):
    """Do checkout."""
    cart = db.session.get(services.Cart, cart_id)
    if cart is None:
        return jsonify(error="cart not found"), 404
    data = request.get_json(force=True)
    try:
        order = services.checkout(cart, data.get("email", ""), data.get("card_token", ""))
    except services.CheckoutError as e:
        return jsonify(error=str(e)), 400
    return jsonify(order_id=order.id, status=order.status, total=str(order.total)), 201


@bp.get("/api/orders/<int:order_id>")
def get_order(order_id):
    """Get order."""
    order = db.session.get(Order, order_id)
    email = request.args.get("email", "").lower()
    if order is None or order.email.lower() != email:  # same 404 for unknown order and wrong email
        return jsonify(error="order not found"), 404
    return jsonify(order_id=order.id, status=order.status, total=str(order.total))


@bp.get("/")
def index():
    """Index."""
    return render_template("index.html")
