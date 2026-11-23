"""Support chatbot: retrieves order status + policy text, then asks the LLM.

Responsible-AI rule: the bot must NEVER invent refund (or any) policy. If the
written policy has no grounded answer, or the question is a sensitive policy
decision, the bot escalates to a human instead of letting the LLM guess.
"""
import os
import re
from pathlib import Path

import requests

from ..models import Order, db

POLICY_PATH = Path(__file__).with_name("policy.md")
STOPWORDS = {"the", "a", "an", "is", "are", "to", "of", "my", "i", "do", "does", "can", "how", "what",
             "when", "will", "it", "for", "and", "in", "on", "me", "you", "your", "be", "get", "if"}
SENSITIVE = ("refund", "money back", "compensation", "chargeback", "legal", "lawyer", "sue")
MIN_SCORE = 1
ESCALATION = ("I can't answer that reliably from our written policy, so I'm passing your question "
              "to a human support agent who will reply by email within 1 business day.")

SYSTEM_PROMPT = (
    "You are ShopSmart's support assistant. Answer ONLY using the CONTEXT below. "
    "If the context does not contain the answer, reply exactly: ESCALATE. "
    "Never invent policies, prices, dates, or refund terms. Never ask for card numbers. "
    "Keep answers under 80 words."
)


def load_sections(path=POLICY_PATH):
    text = Path(path).read_text(encoding="utf-8")
    sections = []
    for block in re.split(r"^## ", text, flags=re.M):
        block = block.strip()
        if block:
            title, _, body = block.partition("\n")
            sections.append((title.strip(), body.strip()))
    return sections


def _tokens(s):
    return {w for w in re.findall(r"[a-z0-9]+", s.lower()) if w not in STOPWORDS}


def retrieve(question, sections=None, k=2):
    sections = sections if sections is not None else load_sections()
    q = _tokens(question)
    scored = []
    for title, body in sections:
        score = len(q & _tokens(title)) * 2 + len(q & _tokens(body))
        if score >= MIN_SCORE:
            scored.append((score, title, body))
    scored.sort(reverse=True)
    return scored[:k]


def find_order_id(question):
    m = re.search(r"(?:order\s*(?:no\.?|number|id)?\s*#?\s*|#)(\d+)", question, flags=re.I)
    return int(m.group(1)) if m else None


def call_llm(system, context, question):
    """Gemini REST call. Returns text or None when no key / failure."""
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {"contents": [{"parts": [{"text": f"{system}\n\nCONTEXT:\n{context}\n\nQUESTION: {question}"}]}]}
    try:
        r = requests.post(url, params={"key": key}, json=payload, timeout=15)
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:  # noqa: BLE001 - any LLM failure falls back safely
        return None


def answer(question, llm=call_llm):
    """Returns dict(answer, source, escalated)."""
    question = (question or "").strip()
    if not question:
        return {"answer": "Please type a question.", "source": "none", "escalated": False}

    order_id = find_order_id(question)
    if order_id is not None:
        order = db.session.get(Order, order_id)
        if order is None:
            return {"answer": f"I couldn't find order #{order_id}. Please check the number.",
                    "source": "orders", "escalated": False}
        return {"answer": f"Order #{order.id} is currently {order.status}. Total: {order.total}.",
                "source": "orders", "escalated": False}

    hits = retrieve(question)
    lowered = question.lower()
    sensitive = any(w in lowered for w in SENSITIVE)
    grounded = [h for h in hits if any(t in _tokens(h[1]) for t in _tokens(question))] if sensitive else hits
    if not hits or (sensitive and not grounded):
        return {"answer": ESCALATION, "source": "escalation", "escalated": True}

    context = "\n\n".join(f"{t}: {b}" for _, t, b in hits)
    text = llm(SYSTEM_PROMPT, context, question)
    if text is None:
        # Offline / LLM failure: return the grounded policy text verbatim.
        best = hits[0]
        return {"answer": f"{best[2]}", "source": "policy", "escalated": False}
    if "ESCALATE" in text.upper():
        return {"answer": ESCALATION, "source": "escalation", "escalated": True}
    return {"answer": text, "source": "llm+policy", "escalated": False}
