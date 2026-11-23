"""Support chatbot: looks up order status and the written policy, then asks the LLM.

Responsible-AI rule: the bot must NEVER invent refund (or any) policy. If the
written policy has no grounded answer, or the LLM's answer is not grounded in
it, the bot escalates to a human instead of guessing.
"""
import os
import re
from pathlib import Path

import requests

from ..models import Order, db

POLICY_PATH = Path(__file__).with_name("policy.md")
STOPWORDS = {
    "the", "a", "an", "is", "are", "to", "of", "my", "i", "do", "does", "can", "how", "what",
    "when", "will", "it", "for", "and", "in", "on", "me", "you", "your", "be", "get", "if",
    "after", "before", "so", "this", "that", "with",
}
SYNONYMS = {
    "dispatch": "ship", "dispatched": "ship", "shipping": "ship", "shipped": "ship",
    "cancelled": "cancel", "cancellation": "cancel",
    "return": "refund", "returns": "refund", "returned": "refund",
}
GENERIC = {"order", "orders", "item", "items"}  # too common to count as evidence
SENSITIVE = ("refund", "money back", "compensation", "chargeback", "legal", "lawyer", "sue")
MIN_SCORE = 2  # one weak word match is not enough evidence to answer
ESCALATION = (
    "I can't answer that reliably from our written policy, so I'm passing your question "
    "to a human support agent who will reply by email within 1 business day."
)
SYSTEM_PROMPT = (
    "You are ShopSmart's support assistant. Answer ONLY using the CONTEXT below. "
    "If the context does not contain the answer, reply exactly: ESCALATE. "
    "Never invent policies, prices, dates, or refund terms. Never ask for card numbers. "
    "Keep answers under 80 words."
)


def load_sections(path=POLICY_PATH):
    """Split policy.md into (title, body) sections."""
    text = Path(path).read_text(encoding="utf-8")
    sections = []
    for block in re.split(r"^## ", text, flags=re.M):
        block = block.strip()
        if block:
            title, _, body = block.partition("\n")
            sections.append((title.strip(), body.strip()))
    return sections


def _stem(word):
    word = SYNONYMS.get(word, word)
    if word.endswith(("us", "ss")):
        return word
    if word.endswith("uses"):  # statuses -> status
        return word[:-2]
    for suffix in ("ing", "ed", "es", "s"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 4:
            return word[: -len(suffix)]
    return word


def _tokens(text):
    words = {_stem(w) for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOPWORDS}
    return words - {_stem(g) for g in GENERIC}


def retrieve(question, sections=None, k=2):
    """Return the top-k policy sections as (score, title, body); title matches count double."""
    sections = sections if sections is not None else load_sections()
    q_tokens = _tokens(question)
    scored = []
    for title, body in sections:
        score = len(q_tokens & _tokens(title)) * 2 + len(q_tokens & _tokens(body))
        if score >= MIN_SCORE:
            scored.append((score, title, body))
    scored.sort(reverse=True)
    return scored[:k]


def find_order_id(question):
    """Extract an order number such as 'order #12' or '#12'."""
    match = re.search(r"(?:order\s*(?:no\.?|number|id)?\s*#?\s*|#)(\d+)", question, flags=re.I)
    return int(match.group(1)) if match else None


def call_llm(system, context, question):
    """Gemini REST call. Returns text, or None when there is no key or the call fails."""
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    prompt = f"{system}\n\nCONTEXT:\n{context}\n\nQUESTION: {question}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        resp = requests.post(url, params={"key": key}, json=payload, timeout=15)
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (requests.RequestException, KeyError, IndexError, ValueError):
        return None  # any LLM failure falls back to the offline path


def numbers_grounded(text, policy):
    """Guardrail: every number the LLM states must appear in the written policy."""
    allowed = set(re.findall(r"\d+", policy))
    return all(n in allowed for n in re.findall(r"\d+", text))


def _reply(text, source, escalated=False):
    return {"answer": text, "source": source, "escalated": escalated}


def _escalate():
    return _reply(ESCALATION, "escalation", True)


ORDER_NOT_FOUND = (
    "I couldn't find that order. To check an order, give me the order number and the email "
    "address used at checkout, for example: order #12 me@example.com"
)


def find_email(question):
    """Extract an email address from the question, lower-cased."""
    match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", question)
    return match.group(0).lower() if match else None


def _order_answer(order_id, email):
    """Privacy: only reveal an order when the email matches; same reply for unknown order and wrong email."""
    order = db.session.get(Order, order_id)
    if order is None or email is None or order.email.lower() != email:
        return _reply(ORDER_NOT_FOUND, "orders")
    return _reply(f"Order #{order.id} is currently {order.status}. Total: {order.total}.", "orders")


def _llm_answer(question, llm):
    """Ask the LLM with the whole policy; None means no LLM was available."""
    policy = "\n\n".join(f"{t}: {b}" for t, b in load_sections())
    text = llm(SYSTEM_PROMPT, policy, question)
    if text is None:
        return None
    if "ESCALATE" in text.upper() or not numbers_grounded(text, policy):
        return _escalate()
    return _reply(text, "llm+policy")


def _offline_answer(question):
    """Keyword retrieval: quote the written policy verbatim, else escalate.

    For sensitive topics (refunds, legal, compensation) at least one retrieved section's
    title must overlap the question, otherwise the bot escalates instead of guessing.
    """
    hits = retrieve(question)
    if not hits:
        return _escalate()
    if any(w in question.lower() for w in SENSITIVE):
        q_tokens = _tokens(question)
        if not any(q_tokens & _tokens(title) for _, title, _ in hits):
            return _escalate()
    return _reply(hits[0][2], "policy")


def answer(question, llm=call_llm):
    """Answer a customer question. Returns dict(answer, source, escalated)."""
    question = (question or "").strip()
    if not question:
        return _reply("Please type a question.", "none")
    order_id = find_order_id(question)
    if order_id is not None:
        return _order_answer(order_id, find_email(question))
    return _llm_answer(question, llm) or _offline_answer(question)
