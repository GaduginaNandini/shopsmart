from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


class ShopPage:
    def __init__(self, driver, base_url):
        self.driver = driver
        self.base_url = base_url

    def open(self):
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".product"))
        )

    def add_product(self, product_id):
        self.driver.find_element(By.ID, f"add-{product_id}").click()
        WebDriverWait(self.driver, 5).until(
            EC.presence_of_element_located((By.ID, f"remove-{product_id}"))
        )

    def apply_coupon(self, code):
        el = self.driver.find_element(By.ID, "coupon")
        el.clear()
        el.send_keys(code)
        self.driver.find_element(By.ID, "apply-coupon").click()

    def checkout(self, email, card_token="tok_ok"):
        email_el = self.driver.find_element(By.ID, "email")
        email_el.clear()
        email_el.send_keys(email)
        token_el = self.driver.find_element(By.ID, "card-token")
        token_el.clear()
        token_el.send_keys(card_token)
        self.driver.find_element(By.ID, "checkout-btn").click()
        WebDriverWait(self.driver, 5).until(
            lambda d: d.find_element(By.ID, "order-result").text.strip() != ""
        )
        return self.driver.find_element(By.ID, "order-result").text

    def ask_chat(self, message):
        inp = self.driver.find_element(By.ID, "chat-input")
        if not inp.is_displayed():
            self.driver.find_element(By.ID, "chat-fab").click()
            WebDriverWait(self.driver, 5).until(EC.visibility_of(inp))
        inp.clear()
        inp.send_keys(message)
        self.driver.find_element(By.ID, "chat-send").click()
        WebDriverWait(self.driver, 8).until(
            lambda d: len(d.find_elements(By.CSS_SELECTOR, "#chat-log .bot")) > 1
        )
        return self.driver.find_elements(By.CSS_SELECTOR, "#chat-log .bot")[-1].text
