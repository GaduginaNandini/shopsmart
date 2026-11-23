"""HTTP routes: catalogue, cart, checkout, orders."""
from flask import Blueprint, jsonify, request

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
    return jsonify([p.to_dict() for p in Product.query.order_by(Product.id).all()])


@bp.post("/api/products")
def create_product():
    data = request.get_json(force=True)
    if not data.get("name") or float(data.get("price", -1)) < 0:
        return jsonify(error="name and non-negative price required"), 400
    p = Product(name=data["name"], price=data["price"], stock=int(data.get("stock", 0)))
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@bp.post("/api/cart")
def new_cart():
    return jsonify(_cart_json(services.get_or_create_cart())), 201


@bp.get("/api/cart/<int:cart_id>")
def get_cart(cart_id):
    cart = db.session.get(services.Cart, cart_id)
    if cart is None:
        return jsonify(error="cart not found"), 404
    return jsonify(_cart_json(cart))


@bp.post("/api/cart/<int:cart_id>/items")
def add_to_cart(cart_id):
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
    cart = db.session.get(services.Cart, cart_id)
    if cart is None:
        return jsonify(error="cart not found"), 404
    services.remove_item(cart, product_id)
    return jsonify(_cart_json(cart))


@bp.post("/api/cart/<int:cart_id>/coupon")
def apply_coupon(cart_id):
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
    order = db.session.get(Order, order_id)
    if order is None:
        return jsonify(error="order not found"), 404
    return jsonify(order_id=order.id, status=order.status, total=str(order.total))


@bp.get("/")
def index():
    return INDEX_HTML


INDEX_HTML = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>ShopSmart</title></head>
<body>
<h1>ShopSmart</h1>
<ul id="products"></ul>
<h2>Support chat</h2>
<input id="msg" placeholder="Ask about an order or policy">
<button id="send">Send</button>
<p id="reply"></p>
<script>
fetch('/api/products').then(r => r.json()).then(ps => {
  const ul = document.getElementById('products');
  ps.forEach(p => { const li = document.createElement('li'); li.textContent = p.name + ' - ' + p.price; ul.appendChild(li); });
});
document.getElementById('send').onclick = () => {
  fetch('/api/chat', {method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({message: document.getElementById('msg').value})})
    .then(r => r.json()).then(d => { document.getElementById('reply').textContent = d.answer; });
};
</script>
</body></html>"""
