"""Integration tests: cart -> order -> chatbot, mocked payment (4.3)."""
from app.chatbot import service


def _buy(client, qty=1, token="tok_ok", pid=1):
    cid = client.post("/api/cart").get_json()["cart_id"]
    client.post(f"/api/cart/{cid}/items", json={"product_id": pid, "quantity": qty})
    return client.post(f"/api/cart/{cid}/checkout", json={"email": "u@example.com", "card_token": token})


def test_order_created_then_chatbot_reports_status(client):
    oid = _buy(client).get_json()["order_id"]
    r = client.post("/api/chat", json={"message": f"What is the status of order #{oid}? u@example.com"}).get_json()
    assert "PAID" in r["answer"] and r["source"] == "orders"


def test_failed_payment_creates_no_order(client):
    assert _buy(client, token="tok_fail").status_code == 400
    r = client.post("/api/chat", json={"message": "status of order 1 u@example.com"}).get_json()
    assert "couldn't find" in r["answer"]


def test_stock_decrements_after_order(client):
    _buy(client, qty=3, pid=2)
    stock = {p["id"]: p["stock"] for p in client.get("/api/products").get_json()}
    assert stock[2] == 2


def test_bulk_and_coupon_total_reaches_order(client):
    cid = client.post("/api/cart").get_json()["cart_id"]
    client.post(f"/api/cart/{cid}/items", json={"product_id": 1, "quantity": 10})
    client.post(f"/api/cart/{cid}/coupon", json={"code": "SAVE10"})
    r = client.post(f"/api/cart/{cid}/checkout", json={"email": "u@example.com", "card_token": "tok_ok"})
    assert r.get_json()["total"] == "427.50"  # 500 -5% = 475 -10% = 427.50


def test_metrics_count_orders(client):
    _buy(client)
    _buy(client, token="tok_fail")
    m = client.get("/metrics").get_data(as_text=True)
    assert "shopsmart_orders_ok_total 1" in m and "shopsmart_orders_failed_total 1" in m


def test_metrics_counter_is_thread_safe(app):
    import threading
    from app import METRICS, bump
    METRICS["orders_ok"] = 0
    ts = [threading.Thread(target=lambda: [bump("orders_ok") for _ in range(500)]) for _ in range(8)]
    [t.start() for t in ts]; [t.join() for t in ts]
    assert METRICS["orders_ok"] == 4000
