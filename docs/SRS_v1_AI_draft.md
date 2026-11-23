# ShopSmart SRS — v1 (AI draft, unedited)

> Drafted by an AI assistant (Claude) from the client notes in the project brief. Kept unedited as evidence for task 1.4.
> **Team note:** if your rubric requires ChatGPT specifically, paste the client notes into ChatGPT and replace this file with its output; the correction table in SRS v2 shows the method.

## 1. Introduction
ShopSmart is a fast, user-friendly e-commerce website for small shops. It lets customers buy products and get help from an intelligent chatbot.

## 2. Functional requirements
- FR1. The system shall show all products to customers.
- FR2. Customers shall be able to add products to a cart and remove them.
- FR3. The system shall give discounts for large orders.
- FR4. The system shall support all popular payment methods at checkout.
- FR5. After payment the system shall send the customer an order confirmation.
- FR6. The shop owner shall be able to manage products.
- FR7. The chatbot shall answer all customer questions quickly and accurately.
- FR8. The chatbot shall tell customers the status of their orders.
- FR9. The chatbot shall answer refund questions. Refunds are allowed within 30 days.
- FR10. The chatbot shall use AI to answer policy questions.
- FR11. Support agents shall be able to take over a conversation when needed.
- FR12. The system shall never sell more items than are in stock.

## 3. Non-functional requirements
- NFR1. The system shall be fast.
- NFR2. The website shall be very easy to use.
- NFR3. The system shall be secure.
- NFR4. The system shall be available 24/7.
- NFR5. The system shall store payment details securely for faster checkout.

## 4. Constraints
- Python web framework, PostgreSQL, a cloud LLM API, Docker.
- Payment is mocked.
- Refunds are allowed within 7 days of delivery.
