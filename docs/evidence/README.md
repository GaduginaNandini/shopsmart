# Evidence index: what is done and what only your team can do

Legend: **Done** = produced and checked in this repo. **Partial** = drafted; you must add the marked part. **Team** = needs your own work, screenshots or data (it cannot be honestly produced by an AI).

| Row | Task | Status | Where | What you still do |
|---|---|---|---|---|
| 1.1 | SDLC comparison + choice | Done | `docs/process-model.md` | Check the scores reflect your judgement |
| 1.2 | Manual vs AI build, time/defects/effort | Team | `evidence/phase1.md` | Build cart/checkout both ways and log your hours |
| 1.3 | Copilot / Tabnine / ChatGPT scorecard | Team | `evidence/phase1.md` | Give each tool the same task; score it |
| 1.4 | SRS v1 (AI) and v2 (corrected) | Done | `docs/SRS_v1_AI_draft.md`, `SRS_v2_corrected.md` | Optionally regenerate v1 with ChatGPT |
| 1.5 | Skeleton review + prompt log | Partial | `docs/ai-usage-log.md` | Add your own prompts and fixes |
| 1.6 | Test cases, defects found/missed | Done | `docs/test-cases.md`, `docs/defect-register.csv` | Add manual results |
| Diagrams | Use case, class, architecture, sequence (PlantUML) | Done | `docs/diagrams/` | Describe what you corrected after AI drafts |
| 2.1 | Manifesto mapping | Done | `docs/agile.md` | |
| 2.2 | Role chart | Partial | `docs/agile.md` | Put real names |
| 2.3 | Meeting notes per event | Team | `docs/templates/meeting-notes.md` | Hold the meetings and write notes |
| 2.4 | Backlog, DoD, increment | Partial | `docs/agile.md`, `user-stories.md` | Mirror in Jira; export |
| 2.5 | XP/Lean/Kanban before-after | Partial | `docs/agile.md` | Fill observations |
| 2.6 | AI vs planning poker | Partial | `docs/agile.md` | Fill poker and actual columns |
| 2.7 | Jira screenshots + tool ratings | Team | | Screenshots from Jira |
| 2.8 | AI in Agile evaluation page | Team | | Use your own data |
| 3.1 | Development diary | Team | `evidence/phase3.md` | Write as you go |
| 3.2 | Prompt library + ratings | Partial | `docs/prompt-library.md` | Run `eval/prompt_variants.py` with an API key; rate |
| 3.3 | Suggestion log | Team | `evidence/phase3.md` | Count accepted/edited/rejected suggestions |
| 3.4 | Branches, PRs, merge conflict | Team | PR template ready | Do it on GitHub; screenshots |
| 3.5 | GitHub Actions green + badge | Partial | `.github/workflows/ci.yml` | Push; screenshot green run; fix README badge URL |
| 3.6 | Jenkins pipeline | Partial | `Jenkinsfile` | Run Jenkins in Docker, webhook, console screenshot |
| 3.7 | Docker evidence | Partial | `Dockerfile`, `docker-compose.yml` | `docker compose up`; screenshot (not run here: no Docker daemon) |
| 3.8 | Benefit-challenge table | Team | | Use your logs |
| 4.1 | 15 manual vs automated | Partial | `docs/test-cases.md` | Run manual cases and time them |
| 4.2 | Unit tests, 80% coverage | Done | `reports/coverage.txt` (93%) | |
| 4.3 | Integration tests | Done | `tests/test_integration.py` | |
| 4.4 | System and acceptance report | Done | `tests/test_acceptance.py`, `docs/screenshots/` | |
| 4.5 | Selenium page-object suite | Partial | `selenium_tests/` | Run locally (not run here: driver mismatch); same 9 journeys passed with Playwright |
| 4.6 | Chatbot tests ranked by risk | Partial | `eval/` | Add risk ranking after your first LLM run |
| 4.7 | Defect prediction / bug detection | Done | `reports/defect_risk.md`, `tools/defect_risk.py` | |
| 4.8 | Health, metrics, dashboard | Partial | `monitoring/`, `/metrics` | Run compose with monitoring; screenshot Grafana |
| 4.9 | AI testing summary | Partial | `docs/test-cases.md` | Write your own summary |
| 5.1 | SQA plan + radar | Done | `docs/sqa-plan.md`, `screenshots/sqa_radar.png` | Replace usability proxy with a 5-user test |
| 5.2 | SonarQube before/after | Team | `sonar-project.properties` | Run SonarQube; I used Pylint 8.49 -> 10.00 and Bandit as a stand-in (`reports/`) |
| 5.3 | Review comparison | Partial | `docs/ai-review-comparison.md` | Add independent AI, SonarQube, human columns |
| 5.4 | Responsible-AI checklist | Done | `docs/responsible-ai-checklist.md` | Add items marked Team |
| 5.5 | Manual vs AI cart/checkout + declaration | Partial | `docs/ai-usage-log.md` | Write cart/checkout by hand and compare |
| 5.6 | Lessons page | Partial | `docs/report` | Add your own lessons |
