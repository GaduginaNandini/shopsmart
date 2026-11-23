# User stories and acceptance criteria

IDs match the acceptance tests in `tests/test_acceptance.py`. Story points are the team's (fill after planning poker); AI estimates are in `evidence/phase2.md`.

| ID | As a... | I want to... | so that... | Acceptance criteria | Test |
|---|---|---|---|---|---|
| US01 | Customer | browse the catalogue | I can choose products | Given products exist, when I open the shop, then each shows name, price and stock | test_US01 |
| US02 | Customer | add and remove cart items | I control what I buy | Adding 2 x INR 50 shows total 100.00; removing the line shows 0.00 | test_US02 |
| US03 | Customer | check out with a card token | I can place an order | Valid email + token creates a PAID order and reduces stock | test_US03 |
| US04 | Customer | be stopped when my email is invalid | orders can be traced | Invalid email returns an error; no order is created | test_US04 |
| US05 | Shop Owner | add products | I can sell new items | With the owner token a product is created; without it the call is refused | test_US05, US05b |
| US06 | Shop Owner | be prevented from entering negative prices | the catalogue stays correct | Negative price is rejected | test_US06 |
| US07 | Customer | ask the chatbot policy questions | I get quick help | "How long does shipping take?" returns the written shipping policy | test_US07 |
| US08 | Support Agent | receive questions the bot cannot answer | customers are never misled | Out-of-policy questions are escalated with the standard hand-over message | test_US08 |
| US09 | Support Agent | be sure the bot never invents refund terms | the shop is not bound to false promises | Refund/compensation questions quote the policy or escalate | test_US09 |
| US10 | Customer | have my order details private | strangers cannot see them | Order status needs order number + matching email | test_US10 |
| US11 | Customer | use a coupon | I save money | SAVE10 reduces the total by 10%; other codes are rejected | test_coupon_flow |
| US12 | Support Agent | manage escalated tickets on a Kanban board (To do / In progress / Done, WIP limit 3) | no customer waits more than 1 business day | Board in Jira shows each escalated question | manual |
