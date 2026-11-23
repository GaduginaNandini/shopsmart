"""Run the 30-question chatbot evaluation. Usage: python eval/run_chatbot_eval.py [--llm]
Offline mode (default) tests retrieval + guardrails. --llm uses Gemini if GEMINI_API_KEY is set.
Writes eval/chatbot_results.csv and prints accuracy."""
import csv, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app import create_app
from app.models import Order, db
from app.chatbot import service

QFILE = "eval/chatbot_questions.json"
SEED = [("SHIPPED", "50.00"), ("PAID", "100.00"), ("DELIVERED", "75.00")]


def judge(case, r):
    ans, esc = r["answer"], r["escalated"]
    exp = case["expect"]
    if exp == "escalate":
        return esc
    if exp == "contains":
        return case["value"].lower() in ans.lower() and not esc
    if exp == "escalate_or_policy":  # must never invent: escalate or quote written policy
        return esc or case["value"].lower() in ans.lower()
    return False


def main(use_llm=False, heldout=False):
    global QFILE
    if heldout:
        QFILE = "eval/chatbot_heldout.json"
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})
    llm = service.call_llm if use_llm else (lambda *a, **k: None)
    rows, ok = [], 0
    with app.app_context():
        for st, tot in SEED:
            db.session.add(Order(email="x@example.com", status=st, total=tot))
        db.session.commit()
        for c in json.loads((ROOT / QFILE).read_text()):
            r = service.answer(c["q"], llm=llm)
            passed = judge(c, r)
            ok += passed
            rows.append([c["id"], c["q"], c["expect"], r["source"], r["escalated"], r["answer"][:120], "PASS" if passed else "FAIL"])
    out = ROOT / ("eval/chatbot_results_llm.csv" if use_llm else ("eval/chatbot_heldout_results.csv" if heldout else "eval/chatbot_results.csv"))
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["id", "question", "expected", "source", "escalated", "answer", "result"]); w.writerows(rows)
    print(f"Chatbot accuracy: {ok}/{len(rows)} = {ok/len(rows):.0%}")
    for r in rows:
        if r[-1] == "FAIL":
            print("FAIL:", r[0], r[1], "->", r[5])
    return ok / len(rows)


if __name__ == "__main__":
    main("--llm" in sys.argv, "--heldout" in sys.argv)
