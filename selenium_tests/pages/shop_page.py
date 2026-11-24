from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait


class ShopPage:
    def __init__(self, driver, base_url):
        self.driver = driver
        self.base_url = base_url

    def _scroll_and_click(self, element):
        self.driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center', inline: 'nearest'});",
            element,
        )
        element.click()

    def open(self):
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".product"))
        )

    def hero_headline(self):
        return self.driver.find_element(By.CSS_SELECTOR, ".hero h1").text

    def product_cards(self):
        return self.driver.find_elements(By.CSS_SELECTOR, ".product")

    def filter_by_category(self, category):
        select_el = self.driver.find_element(By.ID, "category-filter")
        self.driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center'});", select_el
        )
        Select(select_el).select_by_visible_text(category)
        WebDriverWait(self.driver, 5).until(
            lambda d: len(d.find_elements(By.CSS_SELECTOR, ".product")) > 0
        )

    def search(self, query):
        inp = self.driver.find_element(By.ID, "search-q")
        inp.clear()
        inp.send_keys(query)
        self.driver.find_element(By.ID, "search-btn").click()
        WebDriverWait(self.driver, 5).until(
            lambda d: len(d.find_elements(By.CSS_SELECTOR, ".product")) > 0
        )

    def open_product_details(self, product_id):
        title_btn = self.driver.find_element(
            By.CSS_SELECTOR, f"#product-{product_id} .product-title-btn"
        )
        self._scroll_and_click(title_btn)
        modal = self.driver.find_element(By.ID, "product-modal")
        WebDriverWait(self.driver, 5).until(EC.visibility_of(modal))
        return self.driver.find_element(By.ID, "pdp-title").text

    def close_product_details(self):
        self.driver.find_element(By.ID, "pdp-close-btn").click()
        modal = self.driver.find_element(By.ID, "product-modal")
        WebDriverWait(self.driver, 5).until(EC.invisibility_of_element(modal))

    def add_product(self, product_id):
        btn = self.driver.find_element(By.ID, f"add-{product_id}")
        self._scroll_and_click(btn)
        WebDriverWait(self.driver, 5).until(
            EC.presence_of_element_located((By.ID, f"remove-{product_id}"))
        )

    def increase_item_qty(self, product_name):
        before = int(self.get_cart_count())
        btn = self.driver.find_element(
            By.CSS_SELECTOR, f'button[aria-label="Increase {product_name} quantity"]'
        )
        self._scroll_and_click(btn)
        WebDriverWait(self.driver, 5).until(
            lambda d: int(d.find_element(By.ID, "cart-count").text) > before
        )

    def decrease_item_qty(self, product_name):
        before = int(self.get_cart_count())
        btn = self.driver.find_element(
            By.CSS_SELECTOR, f'button[aria-label="Decrease {product_name} quantity"]'
        )
        self._scroll_and_click(btn)
        WebDriverWait(self.driver, 5).until(
            lambda d: int(d.find_element(By.ID, "cart-count").text) < before
        )

    def remove_product(self, product_id):
        btn = self.driver.find_element(By.ID, f"remove-{product_id}")
        self._scroll_and_click(btn)
        WebDriverWait(self.driver, 5).until(
            EC.invisibility_of_element_located((By.ID, f"remove-{product_id}"))
        )

    def get_cart_count(self):
        return self.driver.find_element(By.ID, "cart-count").text.strip()

    def get_cart_total(self):
        return self.driver.find_element(By.ID, "cart-total").text.strip()

    def apply_coupon(self, code):
        el = self.driver.find_element(By.ID, "coupon")
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)
        el.clear()
        el.send_keys(code)
        self.driver.find_element(By.ID, "apply-coupon").click()
        WebDriverWait(self.driver, 5).until(
            lambda d: code.upper() in d.find_element(By.ID, "active-coupon").text.upper()
        )

    def checkout(self, email, card_token="tok_ok"):
        email_el = self.driver.find_element(By.ID, "email")
        self.driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center'});", email_el
        )
        email_el.clear()
        email_el.send_keys(email)
        token_el = self.driver.find_element(By.ID, "card-token")
        token_el.clear()
        token_el.send_keys(card_token)
        self._scroll_and_click(self.driver.find_element(By.ID, "checkout-btn"))
        WebDriverWait(self.driver, 5).until(
            lambda d: d.find_element(By.ID, "order-result").text.strip() != ""
        )
        return self.driver.find_element(By.ID, "order-result").text

    def ask_chat(self, message):
        inp = self.driver.find_element(By.ID, "chat-input")
        if not inp.is_displayed():
            self.driver.find_element(By.ID, "chat-fab").click()
            WebDriverWait(self.driver, 5).until(EC.visibility_of(inp))
        before_count = len(self.driver.find_elements(By.CSS_SELECTOR, "#chat-log .bot"))
        inp.clear()
        inp.send_keys(message)
        self.driver.find_element(By.ID, "chat-send").click()
        WebDriverWait(self.driver, 8).until(
            lambda d: len(d.find_elements(By.CSS_SELECTOR, "#chat-log .bot")) > before_count
        )
        return self.driver.find_elements(By.CSS_SELECTOR, "#chat-log .bot")[-1].text
