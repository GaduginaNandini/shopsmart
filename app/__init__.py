"""ShopSmart application factory."""
import os
import time

from flask import Flask, g, jsonify, request

from .models import db

METRICS = {"requests": 0, "errors": 0, "orders_ok": 0, "orders_failed": 0, "latency_sum": 0.0}


def create_app(config=None):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///shopsmart.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    if config:
        app.config.update(config)

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
        METRICS["requests"] += 1
        METRICS["latency_sum"] += time.perf_counter() - getattr(g, "t0", time.perf_counter())
        if resp.status_code >= 500:
            METRICS["errors"] += 1
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
    return app
