"""Defect-risk ranking (4.7). Combines code metrics (radon), change churn (git) and the team's defect history.
Usage: python tools/defect_risk.py > reports/defect_risk.md
Risk = 0.4*complexity + 0.2*size + 0.2*churn + 0.2*defects (each min-max normalised).
With only a few dozen defects a trained model would be unreliable, so we use a transparent weighted score
and re-check it against later defects; if the team logs 50+ defects, swap in sklearn LogisticRegression."""
import csv, subprocess, sys
from collections import Counter
from pathlib import Path

from radon.complexity import cc_visit
from radon.raw import analyze

ROOT = Path(__file__).resolve().parent.parent


def churn(path):
    try:
        out = subprocess.run(["git", "log", "--oneline", "--", str(path)], cwd=ROOT, capture_output=True, text=True).stdout
        return len(out.splitlines())
    except OSError:
        return 0


def norm(vals):
    lo, hi = min(vals), max(vals)
    return [0 if hi == lo else (v - lo) / (hi - lo) for v in vals]


def main():
    defects = Counter(r["module"] for r in csv.DictReader(open(ROOT / "docs/defect-register.csv")))
    files = [p for p in (ROOT / "app").rglob("*.py") if p.stat().st_size > 0]
    rows = []
    for p in files:
        src = p.read_text()
        blocks = cc_visit(src)
        rel = str(p.relative_to(ROOT))
        rows.append([rel, analyze(src).sloc, max([b.complexity for b in blocks], default=0), churn(p), defects.get(rel, 0)])
    cols = list(zip(*rows))
    n_loc, n_cc, n_ch, n_df = (norm(list(cols[i])) for i in (1, 2, 3, 4))
    for i, r in enumerate(rows):
        r.append(round(0.4 * n_cc[i] + 0.2 * n_loc[i] + 0.2 * n_ch[i] + 0.2 * n_df[i], 2))
    rows.sort(key=lambda r: -r[-1])
    print("| Module | SLOC | Max cyclomatic complexity | Commits touching | Logged defects | Risk score (0-1) |\n|---|---|---|---|---|---|")
    for r in rows:
        print("| " + " | ".join(map(str, r)) + " |")


if __name__ == "__main__":
    main()
