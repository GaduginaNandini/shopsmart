from selenium_tests.pages.shop_page import ShopPage


def test_homepage_loads(driver, base_url):
    page = ShopPage(driver, base_url)
    page.open()
    assert "shopping, reimagined." in page.hero_headline().lower()
    assert len(page.product_cards()) >= 1


def test_product_browsing_and_details(driver, base_url):
    page = ShopPage(driver, base_url)
    page.open()
    page.filter_by_category("Stationery")
    assert len(page.product_cards()) >= 1
    title = page.open_product_details(1)
    assert title.strip() != ""
    page.close_product_details()


def test_add_and_update_cart(driver, base_url):
    page = ShopPage(driver, base_url)
    page.open()
    page.add_product(1)
    assert page.get_cart_count() == "1"
    first_total = float(page.get_cart_total())

    page.increase_item_qty("Notebook")
    assert page.get_cart_count() == "2"
    assert float(page.get_cart_total()) > first_total

    page.decrease_item_qty("Notebook")
    assert page.get_cart_count() == "1"

    page.remove_product(1)
    assert page.get_cart_count() == "0"


def test_catalogue_and_checkout_success(driver, base_url):
    page = ShopPage(driver, base_url)
    page.open()
    page.add_product(1)
    page.apply_coupon("SAVE10")
    result = page.checkout("selenium@example.com", "tok_ok")
    assert "placed" in result.lower()


def test_checkout_declined_payment(driver, base_url):
    page = ShopPage(driver, base_url)
    page.open()
    page.add_product(1)
    result = page.checkout("selenium@example.com", "tok_fail")
    assert "declined" in result.lower()


def test_chatbot_policy_and_escalation(driver, base_url):
    page = ShopPage(driver, base_url)
    page.open()
    reply = page.ask_chat("How long does shipping take?")
    assert "business days" in reply.lower()
