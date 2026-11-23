from app.chatbot import service
from app.models import Order, db


def no_llm(*_a, **_k):
    return None


def test_order_status(app):
    db.session.add(Order(email="a@b.com", total="50.00", status="SHIPPED"))
    db.session.commit()
    r = service.answer("Where is my order #1?", llm=no_llm)
    assert "SHIPPED" in r["answer"] and r["source"] == "orders"


def test_unknown_order(app):
    assert "couldn't find" in service.answer("status of order 999", llm=no_llm)["answer"]


def test_policy_answer_is_grounded(app):
    r = service.answer("How long does shipping take?", llm=no_llm)
    assert "business days" in r["answer"] and not r["escalated"]


def test_refund_is_grounded_in_policy(app):
    r = service.answer("What is your refund policy?", llm=no_llm)
    assert "7 days" in r["answer"]


def test_refund_for_unwritten_case_escalates(app):
    r = service.answer("Can I get compensation and a chargeback for my lawyer?", llm=no_llm)
    assert r["escalated"]


def test_unrelated_question_escalates(app):
    assert service.answer("What is the meaning of life?", llm=no_llm)["escalated"]


def test_llm_escalate_signal(app):
    r = service.answer("How long does shipping take?", llm=lambda *a: "ESCALATE")
    assert r["escalated"]


def test_llm_answer_used(app):
    r = service.answer("How long does shipping take?", llm=lambda *a: "Within 2 days.")
    assert r["source"] == "llm+policy"


def test_empty_message_and_endpoint(client):
    assert service.answer("   ")["source"] == "none"
    assert client.post("/api/chat", json={"message": "shipping time"}).status_code == 200


def test_call_llm_without_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert service.call_llm("s", "c", "q") is None


def test_llm_invented_number_escalates(app):
    # LLM claims a 30-day refund window; policy says 7 -> guardrail must escalate
    r = service.answer("What is your refund policy?", llm=lambda *a: "Refunds are allowed within 30 days.")
    assert r["escalated"] and r["source"] == "escalation"


def test_llm_grounded_number_passes(app):
    r = service.answer("What is your refund policy?", llm=lambda *a: "Refunds within 7 days of delivery.")
    assert not r["escalated"]


def test_llm_receives_full_policy(app):
    seen = {}
    def fake(system, ctx, q):
        seen["ctx"] = ctx
        return "ok"
    service.answer("anything about shipping?", llm=fake)
    assert "Refund policy" in seen["ctx"] and "Shipping" in seen["ctx"]
