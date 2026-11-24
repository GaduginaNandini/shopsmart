from locust import HttpUser, between, task


class ShopSmartUser(HttpUser):
    wait_time = between(0.5, 2.0)

    @task(3)
    def browse_catalogue(self):
        self.client.get("/")
        self.client.get("/api/products")

    @task(2)
    def cart_and_chat(self):
        cart = self.client.post("/api/cart").json()
        cid = cart["cart_id"]
        self.client.post(f"/api/cart/{cid}/items", json={"product_id": 1, "quantity": 2})
        self.client.post(f"/api/cart/{cid}/coupon", json={"code": "SAVE10"})
        self.client.post("/api/chat", json={"message": "How long does shipping take?"})

    @task(1)
    def check_health(self):
        self.client.get("/health")
