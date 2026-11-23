"""Database models: Product, Cart, CartItem, Order, OrderItem."""
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def _now():
    return datetime.now(timezone.utc)


class Product(db.Model):
    """A catalogue item with price and stock."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        """JSON-friendly view of the product."""
        return {"id": self.id, "name": self.name, "price": str(self.price), "stock": self.stock}


class Cart(db.Model):
    """A shopping cart, optionally with a coupon."""
    id = db.Column(db.Integer, primary_key=True)
    coupon = db.Column(db.String(32), nullable=True)
    items = db.relationship("CartItem", backref="cart", cascade="all, delete-orphan")


class CartItem(db.Model):
    """A product and quantity inside a cart."""
    id = db.Column(db.Integer, primary_key=True)
    cart_id = db.Column(db.Integer, db.ForeignKey("cart.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    product = db.relationship("Product")


class Order(db.Model):
    """A paid order; status is PAID, PACKED, SHIPPED, DELIVERED or CANCELLED."""
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(32), nullable=False, default="PAID")
    total = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=_now)
    items = db.relationship("OrderItem", backref="order", cascade="all, delete-orphan")


class OrderItem(db.Model):
    """A product line frozen at purchase price."""
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
