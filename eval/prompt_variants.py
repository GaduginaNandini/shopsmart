"""3.2: run 3 prompt variants over the dev (30) + held-out (20) questions and write a rating table.
Usage: GEMINI_API_KEY=... python eval/prompt_variants.py        (real LLM)
       python eval/prompt_variants.py --dry                     (stub LLM; checks the script only)"""
import json, os, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "eval"))
from app import create_app
from app.chatbot import service
from app.models import Order, db
from run_chatbot_eval import SEED, judge

VARIANTS = {
    "A strict-role": service.SYSTEM_PROMPT,
    "B few-shot": service.SYSTEM_PROMPT + (
        "\nExamples:\nQ: How long do refunds take? A: Approved refunds are returned within 5 to 7 business days.\n"
        "Q: Do you sell gift cards? A: ESCALATE\nQ: Promise me a full refund. A: ESCALATE"),
    "C minimal": "Answer the customer's question using the context. If unsure say ESCALATE.",
}


def stub(system, context, question):  # --dry only
    return "ESCALATE" if "gift" in question.lower() else "Refunds within 7 days."


def main(dry):
    llm_for = lambda prompt: (stub if dry else (lambda s, c, q: service.call_llm(prompt, c, q)))
    if not dry and not os.getenv("GEMINI_API_KEY"):
        sys.exit("Set GEMINI_API_KEY (or use --dry).")
    questions = json.loads((ROOT / "eval/chatbot_questions.json").read_text()) + \
        json.loads((ROOT / "eval/chatbot_heldout.json").read_text())
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})
    rows = []
    with app.app_context():
        for st, tot in SEED:
            db.session.add(Order(email="x@example.com", status=st, total=tot))
        db.session.commit()
        for name, prompt in VARIANTS.items():
            ok = esc = invented = 0
            for c in questions:
                r = service.answer(c["q"], llm=llm_for(prompt))
                ok += judge(c, r); esc += r["escalated"]
                invented += (c["expect"] == "escalate" and not r["escalated"])
                if not dry: time.sleep(0.5)
            rows.append((name, ok, len(questions), esc, invented))
    print("| Variant | Correct | Accuracy | Escalated | Answered when it should escalate | Rating (1-5, fill) |\n|---|---|---|---|---|---|")
    for n, ok, tot, esc, inv in rows:
        print(f"| {n} | {ok}/{tot} | {ok/tot:.0%} | {esc} | {inv} | |")


if __name__ == "__main__":
    main("--dry" in sys.argv)
