"""Page-object for the ShopSmart storefront (4.5)."""
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


class ShopPage:
    def __init__(self, driver, base_url):
        self.d, self.base = driver, base_url
        self.wait = WebDriverWait(driver, 10)

    def open(self):
        self.d.get(self.base)
        self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".product")))
        return self

    def product_count(self):
        return len(self.d.find_elements(By.CSS_SELECTOR, ".product"))

    def add_to_cart(self, product_id):
        self.d.find_element(By.ID, f"add-{product_id}").click()
        self.wait.until(EC.presence_of_element_located((By.ID, f"remove-{product_id}")))
        return self

    def remove_from_cart(self, product_id):
        self.d.find_element(By.ID, f"remove-{product_id}").click()
        self.wait.until(EC.invisibility_of_element_located((By.ID, f"remove-{product_id}")))
        return self

    def cart_total(self):
        return self.d.find_element(By.ID, "cart-total").text

    def apply_coupon(self, code):
        self.d.find_element(By.ID, "coupon").send_keys(code)
        self.d.find_element(By.ID, "apply-coupon").click()
        return self

    def checkout(self, email, token="tok_ok"):
        self.d.find_element(By.ID, "email").send_keys(email)
        tok = self.d.find_element(By.ID, "card-token")
        tok.clear(); tok.send_keys(token)
        self.d.find_element(By.ID, "checkout-btn").click()
        self.wait.until(lambda d: d.find_element(By.ID, "order-result").text != "")
        return self.d.find_element(By.ID, "order-result").text

    def ask_chatbot(self, message):
        self.d.find_element(By.ID, "chat-input").send_keys(message)
        self.d.find_element(By.ID, "chat-send").click()
        self.wait.until(lambda d: "Bot:" in d.find_element(By.ID, "chat-log").text)
        return self.d.find_element(By.ID, "chat-log").text
