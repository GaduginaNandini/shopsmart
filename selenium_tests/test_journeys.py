from selenium_tests.pages.shop_page import ShopPage


def test_catalogue_shows_products(driver, base_url):
    assert ShopPage(driver, base_url).open().product_count() >= 4


def test_add_to_cart_then_checkout_success(driver, base_url):
    page = ShopPage(driver, base_url).open().add_to_cart(1)
    assert page.cart_total() == "50.00"
    msg = page.checkout("student@example.com")
    assert "placed" in msg and "PAID" in msg


def test_declined_payment_shows_error(driver, base_url):
    page = ShopPage(driver, base_url).open().add_to_cart(2)
    assert "declined" in page.checkout("student@example.com", "tok_fail")


def test_coupon_reduces_total(driver, base_url):
    page = ShopPage(driver, base_url).open().add_to_cart(1).apply_coupon("SAVE10")
    page.wait.until(lambda d: page.cart_total() == "45.00")


def test_remove_item_empties_cart(driver, base_url):
    page = ShopPage(driver, base_url).open().add_to_cart(1).remove_from_cart(1)
    assert page.cart_total() == "0.00"


def test_chatbot_answers_policy_question(driver, base_url):
    log = ShopPage(driver, base_url).open().ask_chatbot("How long does shipping take?")
    assert "business days" in log


def test_chatbot_escalates_unknown(driver, base_url):
    log = ShopPage(driver, base_url).open().ask_chatbot("Do you sell gift cards?")
    assert "human support agent" in log
