import sys, time
from playwright.sync_api import sync_playwright
BASE="http://127.0.0.1:5088"; OUT="/tmp/claude-0/vid"
CAP="""(t)=>{let d=document.getElementById('cap');if(!d){d=document.createElement('div');d.id='cap';
d.style.cssText='position:fixed;left:0;right:0;bottom:0;background:rgba(11,110,79,.95);color:#fff;font:600 22px system-ui;padding:14px 24px;z-index:9999';document.body.appendChild(d)}d.textContent=t}"""
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={"width":1280,"height":720},record_video_dir=OUT,record_video_size={"width":1280,"height":720})
    pg=ctx.new_page(); pg.goto(BASE); pg.wait_for_selector(".product")
    def cap(t,w=1.8): pg.evaluate(CAP,t); time.sleep(w)
    cap("ShopSmart: a small shop with a support chatbot that never invents policy",3)
    cap("Add products to the cart"); pg.click("#add-1"); time.sleep(1); pg.click("#add-3"); time.sleep(1.5)
    cap("Coupon SAVE10 takes 10% off"); pg.fill("#coupon","SAVE10"); time.sleep(.5); pg.click("#apply-coupon"); time.sleep(2)
    cap("Checkout with a mocked payment token"); pg.fill("#email","demo@example.com"); time.sleep(.8); pg.click("#checkout-btn"); time.sleep(2.5)
    cap("A declined payment (tok_fail) creates no order"); pg.click("#add-2"); time.sleep(1); pg.fill("#card-token","tok_fail"); pg.click("#checkout-btn"); time.sleep(2.5)
    pg.fill("#card-token","tok_ok")
    def ask(q,note,w=2.8):
        cap(note,1.2); pg.fill("#chat-input",""); pg.type("#chat-input",q,delay=45); time.sleep(.5); pg.click("#chat-send"); time.sleep(w)
    ask("How long does shipping take?","Policy question: answered from the written policy")
    ask("What is the status of order #1? demo@example.com","Order status needs the order number and checkout e-mail")
    ask("order #1","Without the e-mail, the order is not revealed")
    ask("I want compensation and a chargeback","Refund and compensation: no invented terms")
    ask("Do you sell gift cards?","Not in the policy: handed to a human agent",3.5)
    cap("44 tests pass at 93% coverage; held-out chatbot accuracy is 50%, so we ground and escalate",4)
    ctx.close(); b.close()
