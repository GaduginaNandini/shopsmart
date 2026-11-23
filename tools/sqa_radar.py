"""5.1: compute the 5 quality attribute scores (0-5) from measured metrics and draw the radar chart.
Inputs are measured values (sources in docs/sqa-plan.md); change them when you re-measure."""
import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

M = dict(tests_pass=44 / 44, chatbot_heldout=10 / 20, chatbot_dev=30 / 30,
         server_err_rate=0 / 986, defects_fixed=10 / 11,
         pylint=10.0 / 10, coverage=0.93, ui_journeys=9 / 9, p95_ms=11, p95_target_ms=200)
SCORES = {
    "Correctness": 5 * (0.5 * M["tests_pass"] + 0.5 * M["chatbot_heldout"]),
    "Reliability": 5 * (0.5 * (1 - M["server_err_rate"]) + 0.5 * M["defects_fixed"]),
    "Maintainability": 5 * (0.5 * M["pylint"] + 0.5 * M["coverage"]),
    "Usability*": 5 * M["ui_journeys"],
    "Efficiency": 5 * min(1, M["p95_target_ms"] / M["p95_ms"]),
}
TARGET = 4.0

def main(out="docs/screenshots/sqa_radar.png"):
    labels = list(SCORES); vals = [round(v, 2) for v in SCORES.values()]
    ang = [n / len(labels) * 2 * math.pi for n in range(len(labels))]
    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True), dpi=150)
    ax.set_theta_offset(math.pi / 2); ax.set_theta_direction(-1)
    ax.set_xticks(ang); ax.set_xticklabels([f"{l}\n{v}" for l, v in zip(labels, vals)], fontsize=10)
    ax.set_ylim(0, 5); ax.set_yticks([1, 2, 3, 4, 5]); ax.set_yticklabels(["1", "2", "3", "4", "5"], fontsize=8, color="#5d6b7c")
    ax.plot(ang + ang[:1], vals + vals[:1], color="#0b6e4f", lw=2, label="ShopSmart (measured)")
    ax.fill(ang + ang[:1], vals + vals[:1], color="#0b6e4f", alpha=0.18)
    ax.plot(ang + ang[:1], [TARGET] * (len(ang) + 1), color="#b3261e", lw=1.2, ls="--", label=f"Target {TARGET}")
    ax.legend(loc="upper right", bbox_to_anchor=(1.25, 1.12), fontsize=9, frameon=False)
    ax.set_title("ShopSmart quality scorecard (0-5)", pad=24, fontsize=12)
    fig.text(0.5, 0.01, "*Usability = automated journey pass rate only; replace with a 5-user test.", ha="center", fontsize=8, color="#5d6b7c")
    fig.savefig(out, bbox_inches="tight"); print(dict(zip(labels, vals)))

if __name__ == "__main__":
    main()
