"""Acceptance tests, one per user story (4.4). Story IDs match docs/user-stories.md."""
OWNER = {"X-Owner-Token": "owner-dev-token"}


def test_US01_customer_browses_catalogue(client):
    assert len(client.get("/api/products").get_json()) >= 2


def test_US02_customer_adds_and_removes_cart_items(client):
    cid = client.post("/api/cart").get_json()["cart_id"]
    assert client.post(f"/api/cart/{cid}/items", json={"product_id": 1, "quantity": 2}).get_json()["total"] == "100.00"
    assert client.delete(f"/api/cart/{cid}/items/1").get_json()["total"] == "0.00"


def test_US03_customer_checks_out_with_mock_payment(client):
    cid = client.post("/api/cart").get_json()["cart_id"]
    client.post(f"/api/cart/{cid}/items", json={"product_id": 1})
    r = client.post(f"/api/cart/{cid}/checkout", json={"email": "c@example.com", "card_token": "tok_ok"})
    assert r.status_code == 201 and r.get_json()["status"] == "PAID"


def test_US04_checkout_requires_valid_email(client):
    cid = client.post("/api/cart").get_json()["cart_id"]
    client.post(f"/api/cart/{cid}/items", json={"product_id": 1})
    assert client.post(f"/api/cart/{cid}/checkout", json={"email": "bad", "card_token": "tok_ok"}).status_code == 400


def test_US05_owner_adds_product(client):
    r = client.post("/api/products", json={"name": "Mug", "price": "199.00", "stock": 10}, headers=OWNER)
    assert r.status_code == 201
    assert any(p["name"] == "Mug" for p in client.get("/api/products").get_json())


def test_US06_owner_rejects_negative_price(client):
    assert client.post("/api/products", json={"name": "Bad", "price": "-1"}, headers=OWNER).status_code == 400


def test_US07_customer_asks_chatbot_policy_question(client):
    r = client.post("/api/chat", json={"message": "How long does shipping take?"}).get_json()
    assert "business days" in r["answer"]


def test_US08_chatbot_escalates_unknown_to_support_agent(client):
    r = client.post("/api/chat", json={"message": "Do you sell gift cards?"}).get_json()
    assert r["escalated"] is True


def test_US05b_owner_endpoint_rejects_missing_token(client):
    assert client.post("/api/products", json={"name": "Mug", "price": "1"}).status_code == 403


def test_US10_customer_cannot_see_other_customers_order(client):
    cid = client.post("/api/cart").get_json()["cart_id"]
    client.post(f"/api/cart/{cid}/items", json={"product_id": 1})
    oid = client.post(f"/api/cart/{cid}/checkout", json={"email": "c@example.com", "card_token": "tok_ok"}).get_json()["order_id"]
    r = client.post("/api/chat", json={"message": f"order #{oid} thief@example.com"}).get_json()
    assert "PAID" not in r["answer"]


def test_US09_chatbot_never_invents_refund_terms(client):
    r = client.post("/api/chat", json={"message": "I demand compensation and a chargeback"}).get_json()
    assert r["escalated"] is True
