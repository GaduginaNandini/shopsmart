# 28-Day Checklist (4 members: A, B, C, D)

Suggested roles (rotate Scrum Master per sprint): **A** Product Owner / docs lead, **B** backend + CI/CD, **C** chatbot + prompts, **D** testing + QA.

## Days 1-2 Setup
- [ ] A: create GitHub repo, add team, protect `main`, push this scaffold (first commit)
- [ ] B: install Python 3.10+, venv, Docker Desktop; run `docker compose up`
- [ ] C: get Gemini/OpenAI API key; store in `.env` (never commit); test one call
- [ ] D: install Selenium + webdriver-manager, SonarQube (docker), Postman/Newman, VS Code extensions
- [ ] All: Copilot + Tabnine, Jira project, shared Google Sheet for logs; agree on `docs/ai-usage-log.md`

## Days 3-6 Phase 1 (AI in SE)  — docs/evidence/phase1.md
- [ ] A: 1.4 SRS v1 (ChatGPT) then SRS v2 corrected; 1.1 SDLC paragraphs + choice (V-Model vs Incremental)
- [ ] B: 1.2 build cart/checkout manual vs AI, time log; 1.5 skeleton review log
- [ ] C: 1.3 Copilot/Tabnine/ChatGPT scorecard
- [ ] D: 1.6 test cases from requirements, execute, defects found/missed; PlantUML diagrams (A+D)

## Days 7-10 Phase 2 (Agile) — docs/evidence/phase2.md
- [ ] A: 2.1 manifesto mapping, 2.2 role chart, user stories
- [ ] B: 2.4 backlog + DoD, Jira sprints; discount rules pair-programmed with D
- [ ] C: 2.6 AI estimates vs planning poker; 2.7 tool ratings
- [ ] D: 2.3 meeting notes, burndown, 2.5 XP/Lean/Kanban log; 2.8 evaluation page

## Days 11-15 Phase 3 (Dev & Deploy) — docs/evidence/phase3.md
- [ ] A: 3.4 PR template, feature branches, planned merge conflict
- [ ] B: 3.5 GitHub Actions green + badge; 3.7 Docker evidence
- [ ] C: 3.2 prompt library (3 variants rated); 3.3 suggestion log
- [ ] D: 3.6 Jenkinsfile + webhook; 3.1 diary, 3.8 benefit-challenge table (all)

## Days 16-19 Phase 4 (Testing & Monitoring) — docs/evidence/phase4.md
- [ ] A: 4.4 system/acceptance report
- [ ] B: 4.2 unit tests, 4.8 Prometheus + Grafana dashboard
- [ ] C: 4.3 integration tests, 4.6 chatbot test generation + prioritisation
- [ ] D: 4.1 manual vs automated (15 cases), 4.5 Selenium page-objects, 4.7 defect prediction

## Days 20-23 Phase 5 (QA & Ethics) — docs/evidence/phase5.md
- [ ] A: 5.1 SQA plan + radar chart, 5.6 lessons
- [ ] B: 5.2 SonarQube before/after
- [ ] C: 5.4 responsible-AI checklist, chatbot harmful-answer tests
- [ ] D: 5.3 AI vs Sonar vs human review; 5.5 manual vs AI comparison + declaration

## Days 24-26 Integration
- [ ] D: clean-machine run from README only
- [ ] All: full suite, record results vs metrics, fix top defects, freeze code
- [ ] A: tag `v1.0`; C: record 3-minute demo video

## Days 27-28 Documentation
- [ ] A: report ch. 1, 7, 9 + assembly; B: ch. 4, 5; C: ch. 2, 3, 8; D: ch. 5, 6 + appendices
- [ ] C: 12-slide PPT (6 min); A: repo QR code, final declaration signed by all
