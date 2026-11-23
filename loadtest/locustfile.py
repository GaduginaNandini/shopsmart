"""Load test: locust -f loadtest/locustfile.py --host http://localhost:8000 --headless -u 20 -r 5 -t 30s --csv loadtest/results"""
from locust import HttpUser, between, task


class Shopper(HttpUser):
    wait_time = between(0.2, 1)

    def on_start(self):
        self.cart = self.client.post("/api/cart").json()["cart_id"]

    @task(5)
    def browse(self):
        self.client.get("/api/products")

    @task(3)
    def add_item(self):
        self.client.post(f"/api/cart/{self.cart}/items", json={"product_id": 1, "quantity": 1}, name="/api/cart/[id]/items")

    @task(2)
    def ask_chatbot(self):
        self.client.post("/api/chat", json={"message": "How long does shipping take?"})

    @task(1)
    def checkout(self):
        self.client.post(f"/api/cart/{self.cart}/checkout", json={"email": "load@example.com", "card_token": "tok_ok"},
                         name="/api/cart/[id]/checkout")
