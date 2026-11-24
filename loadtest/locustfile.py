"""Locust load-test scenarios for ShopSmart.

Usage:
    locust -f loadtest/locustfile.py --host http://localhost:3000
    locust -f loadtest/locustfile.py --host http://localhost:3000 --headless -u 10 -r 2 -t 30s
"""

from locust import HttpUser, between, task


class ShopSmartUser(HttpUser):
    wait_time = between(0.5, 2.0)

    @task(3)
    def browse_homepage_and_catalogue(self):
        self.client.get("/", name="GET / (homepage)")
        self.client.get("/api/products", name="GET /api/products")
        self.client.get(
            "/api/products?category=Stationery",
            name="GET /api/products?category=Stationery",
        )

    @task(2)
    def view_product_details(self):
        with self.client.get(
            "/api/products", name="GET /api/products (discover id)", catch_response=True
        ) as resp:
            if resp.status_code != 200:
                resp.failure(f"Unexpected status {resp.status_code}")
                return
            products = resp.json()
            if not products:
                return
            product_id = products[0]["id"]
        self.client.get(f"/api/products/{product_id}", name="GET /api/products/:id")

    @task(2)
    def manage_cart(self):
        cart_resp = self.client.post("/api/cart", name="POST /api/cart")
        if cart_resp.status_code != 201:
            return
        cid = cart_resp.json()["cart_id"]

        self.client.post(
            f"/api/cart/{cid}/items",
            json={"product_id": 1, "quantity": 1},
            name="POST /api/cart/:id/items",
        )
        self.client.patch(
            f"/api/cart/{cid}/items/1",
            json={"quantity": 2},
            name="PATCH /api/cart/:id/items/:productId",
        )
        self.client.get(f"/api/cart/{cid}", name="GET /api/cart/:id")
        self.client.post(
            f"/api/cart/{cid}/coupon",
            json={"code": "SAVE10"},
            name="POST /api/cart/:id/coupon",
        )

    @task(1)
    def check_health(self):
        self.client.get("/health", name="GET /health")
