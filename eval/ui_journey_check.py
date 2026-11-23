"""Browser journey check using Playwright (used in the sandbox where Selenium's driver could not be matched).
Mirrors selenium_tests/test_journeys.py and saves screenshots. Usage: python eval/ui_journey_check.py http://127.0.0.1:5055"""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5055"
SHOTS = "docs/screenshots"
results = []

def check(name, cond):
    results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name)

with sync_playwright() as p:
    b = p.chromium.launch()
    def page():
        pg = b.new_page(viewport={"width": 1280, "height": 900}, device_scale_factor=1)
        pg.goto(BASE); pg.wait_for_selector(".product"); return pg

    pg = page(); check("catalogue shows >=4 products", pg.locator(".product").count() >= 4)
    pg.screenshot(path=f"{SHOTS}/01_catalogue.png")

    pg = page(); pg.click("#add-1"); pg.wait_for_selector("#remove-1")
    check("add to cart total 50.00", pg.inner_text("#cart-total") == "50.00")
    pg.fill("#email", "student@example.com"); pg.click("#checkout-btn")
    pg.wait_for_function("document.getElementById('order-result').textContent !== ''")
    msg = pg.inner_text("#order-result"); check("checkout success PAID", "placed" in msg and "PAID" in msg)
    pg.screenshot(path=f"{SHOTS}/02_checkout_success.png")

    pg = page(); pg.click("#add-2"); pg.wait_for_selector("#remove-2")
    pg.fill("#email", "student@example.com"); pg.fill("#card-token", "tok_fail"); pg.click("#checkout-btn")
    pg.wait_for_function("document.getElementById('order-result').textContent !== ''")
    check("declined payment shows error", "declined" in pg.inner_text("#order-result"))
    pg.screenshot(path=f"{SHOTS}/03_payment_declined.png")

    pg = page(); pg.click("#add-1"); pg.wait_for_selector("#remove-1"); pg.fill("#coupon", "SAVE10"); pg.click("#apply-coupon")
    pg.wait_for_function("document.getElementById('cart-total').textContent === '45.00'", timeout=5000)
    check("coupon SAVE10 -> 45.00", pg.inner_text("#cart-total") == "45.00")

    pg = page(); pg.click("#add-1"); pg.wait_for_selector("#remove-1"); pg.click("#remove-1")
    pg.wait_for_function("document.getElementById('cart-total').textContent === '0.00'")
    check("remove empties cart", pg.inner_text("#cart-total") == "0.00")

    pg = page(); pg.fill("#chat-input", "How long does shipping take?"); pg.click("#chat-send")
    pg.wait_for_function("document.getElementById('chat-log').textContent.includes('Bot:')")
    check("chatbot policy answer", "business days" in pg.inner_text("#chat-log"))
    pg.fill("#chat-input", "Do you sell gift cards?"); pg.click("#chat-send")
    pg.wait_for_function("document.getElementById('chat-log').textContent.includes('human support agent')")
    check("chatbot escalates unknown", "human support agent" in pg.inner_text("#chat-log"))
    pg.fill("#chat-input", "What is the status of order #1?"); pg.click("#chat-send")
    pg.wait_for_function("document.getElementById('chat-log').textContent.includes('Order #1')")
    check("chatbot order status from real order", "PAID" in pg.inner_text("#chat-log"))
    pg.screenshot(path=f"{SHOTS}/04_chatbot.png")
    b.close()

ok = sum(r[1] for r in results); print(f"\nUI journeys: {ok}/{len(results)} passed")
sys.exit(0 if ok == len(results) else 1)
