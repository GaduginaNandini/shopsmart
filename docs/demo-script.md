# 3-minute demo script (record your voice over `docs/demo/shopsmart_demo.mp4`, or re-record live)

| Time | On screen | Say |
|---|---|---|
| 0:00-0:15 | Catalogue page | "Small shops lose customers when questions go unanswered. ShopSmart is a shop with a support chatbot that never invents policy." |
| 0:15-0:55 | Add Notebook and Desk Lamp, apply SAVE10 | "Customers add items; bulk and coupon rules are unit-tested. SAVE10 takes 10 percent off." |
| 0:55-1:25 | Checkout with tok_ok, then tok_fail | "Payment is mocked. A valid token creates a PAID order; tok_fail is declined and stock stays unchanged." |
| 1:25-2:15 | Chat: shipping, order status with e-mail, order without e-mail, compensation question, gift cards | "Policy answers come from the written policy. Order status needs the order number and checkout e-mail. Anything the policy does not cover, like compensation or gift cards, goes to a human agent." |
| 2:15-2:40 | Terminal: `pytest --cov=app`, `python eval/run_chatbot_eval.py` | "44 tests pass at 93 percent coverage. The chatbot scores 30 of 30 on the evaluation set, and 10 of 20 on unseen questions, which is why we ground and escalate." |
| 2:40-3:00 | Slide 12 or GitHub page | "Outcomes, what we learned about verifying AI output, and two improvements: measure the LLM mode and add cart sessions." |
