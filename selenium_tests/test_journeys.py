from selenium_tests.pages.shop_page import ShopPage


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
