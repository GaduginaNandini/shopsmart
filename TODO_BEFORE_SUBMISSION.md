# Before you submit (things only your team can do)

1. **Push to GitHub** (`git remote add origin <url>; git push -u origin main --tags`). Replace `<your-org>` in README badge, deck slides 1 and 12, and the report.
2. **Capture proof screenshots** into `docs/screenshots/`: green GitHub Actions run, Jenkins console, `docker compose up` running, Grafana dashboard (`docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up`), SonarQube before/after, Jira board and burndown.
3. **Run with a Gemini key** (`export GEMINI_API_KEY=...`): `python eval/run_chatbot_eval.py --llm`, `--heldout --llm`, `python eval/prompt_variants.py`. Put real numbers in README, report chapter 4, 5, 7 and slide 10.
4. **Run Selenium locally**: `pytest selenium_tests` (needs Chrome).
5. **Fill the [fill] cells** in the report: names, manual-vs-AI hours, tool scorecard, planning poker, meeting notes, suggestion log, benefit-challenge table, SonarQube, independent AI and human review columns.
6. **Add your own rows** to `docs/ai-usage-log.md` and sign the declaration (report chapter 8.4).
7. **Slides:** run `python tools/make_qr.py <repo-url> docs/screenshots/repo_qr.png` and place the QR on slide 12; rehearse with the notes (about 6 minutes).
8. **Demo video:** `docs/demo/shopsmart_demo.mp4` is a 60-second captioned recording without voice; narrate it using `docs/demo-script.md` (3 minutes).
9. Re-run `pytest --cov=app`, `pylint app`, `bandit -r app` after any change, then `git tag -f v1.0` if you re-freeze.
