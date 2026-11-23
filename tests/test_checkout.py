def _cart(client):
    return client.post("/api/cart").get_json()["cart_id"]


def test_full_checkout_flow(client):
    cid = _cart(client)
    assert client.post(f"/api/cart/{cid}/items", json={"product_id": 1, "quantity": 2}).status_code == 200
    r = client.post(f"/api/cart/{cid}/checkout", json={"email": "a@b.com", "card_token": "tok_ok"})
    assert r.status_code == 201
    assert r.get_json()["total"] == "100.00"
    oid = r.get_json()["order_id"]
    assert client.get(f"/api/orders/{oid}").get_json()["status"] == "PAID"
    stock = {p["id"]: p["stock"] for p in client.get("/api/products").get_json()}
    assert stock[1] == 98


def test_payment_declined_keeps_stock(client):
    cid = _cart(client)
    client.post(f"/api/cart/{cid}/items", json={"product_id": 2, "quantity": 1})
    r = client.post(f"/api/cart/{cid}/checkout", json={"email": "a@b.com", "card_token": "tok_fail"})
    assert r.status_code == 400
    stock = {p["id"]: p["stock"] for p in client.get("/api/products").get_json()}
    assert stock[2] == 5


def test_empty_cart_rejected(client):
    cid = _cart(client)
    r = client.post(f"/api/cart/{cid}/checkout", json={"email": "a@b.com", "card_token": "x"})
    assert r.status_code == 400


def test_over_stock_rejected(client):
    cid = _cart(client)
    r = client.post(f"/api/cart/{cid}/items", json={"product_id": 2, "quantity": 6})
    assert r.status_code == 400


def test_coupon_flow(client):
    cid = _cart(client)
    client.post(f"/api/cart/{cid}/items", json={"product_id": 1, "quantity": 2})
    assert client.post(f"/api/cart/{cid}/coupon", json={"code": "SAVE10"}).get_json()["total"] == "90.00"
    assert client.post(f"/api/cart/{cid}/coupon", json={"code": "NOPE"}).status_code == 400


def test_remove_item_and_unknown_cart(client):
    cid = _cart(client)
    client.post(f"/api/cart/{cid}/items", json={"product_id": 1})
    assert client.delete(f"/api/cart/{cid}/items/1").get_json()["items"] == []
    assert client.get("/api/cart/9999").status_code == 404


def test_health_metrics_index(client):
    assert client.get("/health").get_json() == {"status": "ok"}
    assert "shopsmart_requests_total" in client.get("/metrics").get_data(as_text=True)
    assert b"ShopSmart" in client.get("/").data
