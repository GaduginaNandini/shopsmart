"""ShopSmart application factory."""
import os
import threading
import time

from flask import Flask, g, jsonify, request

from .models import db

_LOCK = threading.Lock()
METRICS = {"requests": 0, "errors": 0, "orders_ok": 0, "orders_failed": 0, "latency_sum": 0.0}


def bump(key, amount=1):
    """Thread-safe counter increment."""
    with _LOCK:
        METRICS[key] += amount


def create_app(config=None):
    """Create app."""
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///shopsmart.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    if config:
        app.config.update(config)

    for k in METRICS:  # fresh counters per app instance
        METRICS[k] = 0
    db.init_app(app)

    from .routes import bp
    from .chatbot.routes import chat_bp

    app.register_blueprint(bp)
    app.register_blueprint(chat_bp)

    @app.before_request
    def _start():
        g.t0 = time.perf_counter()

    @app.after_request
    def _record(resp):
        bump("requests")
        bump("latency_sum", time.perf_counter() - getattr(g, "t0", time.perf_counter()))
        if resp.status_code >= 500:
            bump("errors")
        return resp

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    @app.get("/metrics")
    def metrics():
        n = max(METRICS["requests"], 1)
        lines = [
            f"shopsmart_requests_total {METRICS['requests']}",
            f"shopsmart_errors_total {METRICS['errors']}",
            f"shopsmart_orders_ok_total {METRICS['orders_ok']}",
            f"shopsmart_orders_failed_total {METRICS['orders_failed']}",
            f"shopsmart_response_seconds_avg {METRICS['latency_sum'] / n:.6f}",
        ]
        return "\n".join(lines) + "\n", 200, {"Content-Type": "text/plain; version=0.0.4"}

    with app.app_context():
        db.create_all()
        from .models import Product
        if not app.config.get("TESTING") and Product.query.count() == 0:
            db.session.add_all([
                Product(name="Notebook", price="50.00", stock=100),
                Product(name="Pen Set", price="120.00", stock=40),
                Product(name="Desk Lamp", price="799.00", stock=15),
                Product(name="Backpack", price="1499.00", stock=8),
            ])
            db.session.commit()
    return app
