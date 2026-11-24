// Builds docs/ShopSmart_Presentation.pptx  (run: node deck/build_deck.js from the repo root)
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/root/.claude/skills/synced/d60ab9e7-a8a9-4cd7-9115-cadb04ade45c_8282c35e-8350-49f4-b4bb-d5f4e1e650a8/pptx/scripts/apply_theme.js");
const fs = require("fs");

const THEME = {
  name: "ShopSmart", headFontFace: "Cambria", bodyFontFace: "Calibri",
  colors: { dk1: "17231F", lt1: "FFFFFF", dk2: "0B6E4F", lt2: "EEF4F1",
    accent1: "0B6E4F", accent2: "F2A541", accent3: "B3261E", accent4: "5D6B7C",
    accent5: "2E7D9A", accent6: "97BC62", hlink: "0B6E4F", folHlink: "5D6B7C" },
};
const HEX = THEME.colors; // hex needed only where scheme colours are not accepted (chart series, grid lines)

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.title = "ShopSmart: E-Commerce Platform with AI Support Chatbot";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const IMG = (p) => `docs/${p}`;

pres.defineSlideMaster({
  title: "DARK", background: { color: HEX.dk2 }, margin: [0.5, 0.5, 0.5, 0.5],
  objects: [{ placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.45, w: 9, h: 0.9, fontFace: "Cambria", fontSize: 36, bold: true, align: "left", color: C.background1, valign: "top", margin: 0 }, text: "" } }],
});
pres.defineSlideMaster({
  title: "CONTENT", background: { color: HEX.lt1 }, margin: [0.5, 0.5, 0.5, 0.5],
  objects: [{ placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9, h: 0.75, fontFace: "Cambria", fontSize: 28, bold: true, align: "left", color: C.text2, valign: "top", margin: 0 }, text: "" } }],
  slideNumber: { x: 9.2, y: 5.25, w: 0.5, h: 0.25, fontFace: "Calibri", fontSize: 10, color: C.accent4 },
});

const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, fontFace: "Calibri", margin: 0, valign: "top" }, o));
const card = (s, name, x, y, w, h, fill) => s.addShape(pres.ShapeType.roundRect, { objectName: name, x, y, w, h, rectRadius: 0.08, fill: { color: fill || C.background2 }, line: { type: "none" } });
const shot = (s, name, path, x, y, w, h) => {
  s.addShape(pres.ShapeType.roundRect, { objectName: name + " frame", x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, rectRadius: 0.06, fill: { color: C.background1 }, line: { color: C.accent4, width: 0.75 }, shadow: { type: "outer", color: "000000", opacity: 0.18, blur: 6, offset: 2, angle: 90 } });
  s.addImage({ objectName: name, path: IMG(path), x, y, w, h });
};
const circle = (s, n, x, y, d, fill) => {
  s.addShape(pres.ShapeType.ellipse, { objectName: "Badge " + n, x, y, w: d, h: d, fill: { color: fill || C.accent1 }, line: { type: "none" } });
  T(s, String(n), { x, y, w: d, h: d, align: "center", valign: "middle", fontSize: 16, bold: true, color: C.background1 });
};
const stat = (s, big, label, x, y, w, color) => {
  T(s, big, { objectName: "Stat " + label, x, y, w, h: 0.9, fontFace: "Cambria", fontSize: 54, bold: true, color: color || C.accent1 });
  T(s, label, { x, y: y + 0.95, w, h: 0.6, fontSize: 14, color: C.text1 });
};

// ---- 1 Title
pres.addSection({ title: "Introduction" });
let s = pres.addSlide({ masterName: "DARK", sectionTitle: "Introduction" });
s.addText("ShopSmart", { placeholder: "title", fontSize: 48 });
T(s, "E-commerce platform with an AI support chatbot", { x: 0.5, y: 1.35, w: 4.8, h: 0.9, fontFace: "Cambria", fontSize: 22, color: C.background1 });
T(s, "Project P03 · AI in Software Engineering", { x: 0.5, y: 2.45, w: 4.8, h: 0.35, fontSize: 16, color: C.accent2, bold: true });
T(s, [{ text: "Team: [names]", options: { breakLine: true } }, { text: "Guide: [name]", options: { breakLine: true } }, { text: "College: [college]", options: { breakLine: true } }, { text: "github.com/[your-org]/shopsmart" }],
  { x: 0.5, y: 3.2, w: 4.8, h: 1.5, fontSize: 16, color: C.background1, paraSpaceAfter: 4 });
shot(s, "Catalogue screenshot", "screenshots/01_catalogue.png", 5.6, 1.1, 3.9, 2.74);
T(s, "The running storefront: catalogue, cart and support chat", { x: 5.6, y: 4.05, w: 3.9, h: 0.4, fontSize: 12, color: C.background2 });
s.addNotes("Introduce the project, team and guide. ShopSmart is a small online shop with a support chatbot that answers order and policy questions without inventing policy. About 20 seconds.");

// ---- 2 Problem and users
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Introduction" });
s.addText("Unanswered questions cost shops customers", { placeholder: "title" });
T(s, "A chatbot answers instantly, but a language model left alone can promise a refund the shop cannot give.", { x: 0.5, y: 1.2, w: 4.1, h: 1.3, fontSize: 18, color: C.text1 });
T(s, [{ text: "Goal: ", options: { bold: true, color: C.accent1 } }, { text: "answer from written policy, and hand everything else to a human." }], { x: 0.5, y: 2.7, w: 4.1, h: 1.0, fontSize: 16, color: C.text1 });
const users = [["Customer", "Browse, fill a cart, check out, ask about orders and policy"], ["Shop owner", "Add products and keep stock accurate"], ["Support agent", "Receives only questions the bot cannot answer from policy"]];
users.forEach((u, i) => { const y = 1.2 + i * 1.3; card(s, "User card " + u[0], 5.0, y, 4.5, 1.1); circle(s, i + 1, 5.2, y + 0.3, 0.5); T(s, u[0], { x: 5.9, y: y + 0.15, w: 3.5, h: 0.35, fontSize: 18, bold: true, color: C.text2 }); T(s, u[1], { x: 5.9, y: y + 0.52, w: 3.5, h: 0.5, fontSize: 14, color: C.text1 }); });
T(s, "Scope: catalogue, cart, mocked checkout, orders, chatbot. Out: real payments and accounts.", { x: 0.5, y: 4.3, w: 4.1, h: 0.7, fontSize: 14, color: C.accent4 });
s.addNotes("Three users: customer, owner, support agent. The key risk is a chatbot inventing a refund promise, so the design answers only from written policy and escalates the rest. About 30 seconds.");

// ---- 3 Architecture
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Introduction" });
s.addText("Architecture: Flask app, guarded chatbot", { placeholder: "title" });
shot(s, "Architecture diagram", "diagrams/architecture.png", 0.6, 1.3, 5.4, 3.28);
[["Policy only", "Answers come from policy.md and the order database"], ["Numeric check", "A number not in the policy turns the answer into a hand-over"], ["Order privacy", "Order number plus checkout e-mail required"]].forEach((r, i) => {
  const y = 1.3 + i * 1.15; circle(s, i + 1, 6.4, y, 0.45); T(s, r[0], { x: 7.0, y: y - 0.02, w: 2.5, h: 0.3, fontSize: 16, bold: true, color: C.text2 }); T(s, r[1], { x: 7.0, y: y + 0.3, w: 2.5, h: 0.75, fontSize: 14, color: C.text1 });
});
T(s, "Payment is mocked. Prometheus scrapes /metrics. Docker and CI/CD deploy the container.", { x: 0.6, y: 4.85, w: 8.8, h: 0.35, fontSize: 12, color: C.accent4 });
s.addNotes("Browser to Flask. The chatbot looks up orders in the database and sends the whole written policy to the LLM, but only accepts the answer if it adds no number that is not in the policy. Otherwise it escalates. About 35 seconds.");

// ---- 4 Phase 1
pres.addSection({ title: "Phases" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Phases" });
s.addText("Phase 1: AI drafts, the team corrects", { placeholder: "title" });
stat(s, "12", "corrections turning the AI's SRS draft into v2 (5 vague, 3 conflicting, 4 missing)", 0.5, 1.3, 2.8);
stat(s, "55/65", "weighted score for Incremental, ahead of Prototype 51 and V-Model 37", 3.6, 1.3, 2.8);
stat(s, "4", "PlantUML diagrams: use case, class, architecture, chatbot sequence", 6.7, 1.3, 2.8);
card(s, "Phase 1 takeaway", 0.5, 3.6, 9.0, 1.25);
T(s, [{ text: "Example: ", options: { bold: true, color: C.accent1 } }, { text: "the AI draft allowed refunds in 30 days in one line and 7 days in another. SRS v2 keeps one rule, taken from the written policy. Model chosen: Incremental, with test IDs per requirement." }], { x: 0.75, y: 3.75, w: 8.5, h: 1.0, fontSize: 16, color: C.text1 });
s.addNotes("The AI's first SRS had vague and conflicting lines. We fixed twelve. We compared five process models and chose Incremental because the 28-day deadline needs a working release every week. About 30 seconds.");

// ---- 5 Phase 2
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Phases" });
s.addText("Phase 2: three sprints, twelve stories", { placeholder: "title" });
[["Sprint 1", "Cart", "Browse, cart, coupon and bulk pricing", "10 points"], ["Sprint 2", "Checkout", "Mock payment, e-mail check, owner products, order privacy", "15 points"], ["Sprint 3", "Chatbot", "Policy answers, escalation, no invented refunds, support Kanban", "18 points"]].forEach((c, i) => {
  const x = 0.5 + i * 3.1; card(s, c[0] + " card", x, 1.3, 2.9, 2.4);
  T(s, c[0], { x: x + 0.2, y: 1.45, w: 2.5, h: 0.3, fontSize: 14, bold: true, color: C.accent4 });
  T(s, c[1], { x: x + 0.2, y: 1.8, w: 2.5, h: 0.5, fontFace: "Cambria", fontSize: 26, bold: true, color: C.text2 });
  T(s, c[2], { x: x + 0.2, y: 2.4, w: 2.5, h: 0.85, fontSize: 14, color: C.text1 });
  T(s, c[3], { x: x + 0.2, y: 3.25, w: 2.5, h: 0.3, fontSize: 14, bold: true, color: C.accent1 });
});
T(s, [{ text: "Practices: ", options: { bold: true, color: C.accent1 } }, { text: "Scrum Master rotates each sprint; pair programming on discount rules; Kanban with a WIP limit of 3 for support tickets; Definition of Done includes a reviewed PR and 80% coverage." }], { x: 0.5, y: 3.95, w: 9.0, h: 0.8, fontSize: 14, color: C.text1 });
T(s, "AI estimates vs planning poker: [team data]", { x: 0.5, y: 4.85, w: 9.0, h: 0.3, fontSize: 12, color: C.accent4 });
s.addNotes("Three increments of 10, 15 and 18 AI-estimated story points. The Scrum Master rotates. Compare the AI estimates with the team's planning poker and actual days. About 30 seconds.");

// ---- 6 Phase 3
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Phases" });
s.addText("Phase 3: AI helped, and failed in specific ways", { placeholder: "title" });
card(s, "AI helped", 0.5, 1.3, 4.4, 2.6);
T(s, "Where AI helped", { x: 0.7, y: 1.45, w: 4.0, h: 0.35, fontSize: 18, bold: true, color: C.accent1 });
T(s, [{ text: "Scaffold, models and 23 first tests in minutes", options: { bullet: true, breakLine: true } }, { text: "Prometheus metrics endpoint", options: { bullet: true, breakLine: true } }, { text: "Docker, CI and Jenkins files", options: { bullet: true } }], { x: 0.7, y: 1.9, w: 4.0, h: 1.9, fontSize: 15, color: C.text1, paraSpaceAfter: 6 });
card(s, "AI failed", 5.1, 1.3, 4.4, 2.6);
T(s, "Where it failed", { x: 5.3, y: 1.45, w: 4.0, h: 0.35, fontSize: 18, bold: true, color: C.accent3 });
T(s, [{ text: "Retrieval: 7 of 30 questions wrong at first", options: { bullet: true, breakLine: true } }, { text: "Metrics wrong with two workers", options: { bullet: true, breakLine: true } }, { text: "No stock lock: possible oversell", options: { bullet: true } }], { x: 5.3, y: 1.9, w: 4.0, h: 1.9, fontSize: 15, color: C.text1, paraSpaceAfter: 6 });
const flow = ["Push", "GitHub Actions", "Jenkins", "Docker image"];
flow.forEach((f, i) => { const x = 0.5 + i * 2.35; s.addShape(pres.ShapeType.roundRect, { objectName: "Pipeline " + f, x, y: 4.2, w: 2.0, h: 0.55, rectRadius: 0.08, fill: { color: C.accent1 }, line: { type: "none" } }); T(s, f, { x, y: 4.2, w: 2.0, h: 0.55, align: "center", valign: "middle", fontSize: 14, bold: true, color: C.background1 }); if (i < 3) T(s, ">", { x: x + 2.0, y: 4.2, w: 0.35, h: 0.55, align: "center", valign: "middle", fontSize: 18, bold: true, color: C.accent4 }); });
T(s, "Pipelines written and validated; first green run: [team to capture]", { x: 0.5, y: 4.9, w: 9.0, h: 0.3, fontSize: 12, color: C.accent4 });
s.addNotes("AI saved time on scaffolding and configuration. It also made specific, findable mistakes: weak retrieval, shared metrics counters, and no stock lock. The pipeline files are written; the first green run and Docker evidence come from the team's machines. About 35 seconds.");

// ---- 7 Phase 4
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Phases" });
s.addText("Phase 4: 44 tests pass at 93% coverage", { placeholder: "title" });
s.addChart(pres.charts.BAR, [{ name: "Tests", labels: ["Unit (price, discount, stock)", "Integration (cart, order, chatbot)", "Acceptance (per story)", "Chatbot guardrails"], values: [13, 6, 11, 14] }], {
  x: 0.5, y: 1.2, w: 5.6, h: 3.4, barDir: "bar", chartColors: [HEX.accent1], showTitle: true, title: "Automated tests by level", titleFontFace: "+mn-lt", titleFontSize: 14, titleColor: HEX.dk1,
  showValue: true, dataLabelPosition: "outEnd", dataLabelFontFace: "+mn-lt", dataLabelFontSize: 12, dataLabelColor: HEX.dk1, showLegend: false,
  catAxisLabelFontFace: "+mn-lt", catAxisLabelFontSize: 12, catAxisLabelColor: HEX.dk1, valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" }, catAxisOrientation: "maxMin",
});
stat(s, "986", "load-test requests with 0 server errors; p95 response 11 ms", 6.5, 1.2, 3.0);
stat(s, "9/9", "browser journeys pass (Playwright; Selenium suite ready)", 6.5, 2.95, 3.0, HEX.accent2 === "F2A541" ? C.accent5 : C.accent1);
T(s, "Integration tests use a mocked payment; the load test exposed the metrics and thread-safety bugs.", { x: 0.5, y: 4.75, w: 9.0, h: 0.4, fontSize: 12, color: C.accent4 });
s.addNotes("Forty-four automated tests at 93 percent coverage. Integration tests run the cart to order flow with mocked payment, then ask the chatbot for the order status. The load test found two real bugs that functional tests missed. About 35 seconds.");

// ---- 8 Phase 5
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Phases" });
s.addText("Phase 5: AI review found what the tools missed", { placeholder: "title" });
card(s, "Static analysis", 0.5, 1.3, 4.4, 1.9);
T(s, "Pylint score", { x: 0.7, y: 1.45, w: 4.0, h: 0.3, fontSize: 14, color: C.accent4 });
T(s, [{ text: "8.49", options: { color: C.accent3 } }, { text: "  to  ", options: { fontSize: 18, color: C.accent4 } }, { text: "10.00", options: { color: C.accent1 } }], { x: 0.7, y: 1.8, w: 4.0, h: 0.8, fontFace: "Cambria", fontSize: 40, bold: true });
T(s, "Bandit: 0 findings. Worst complexity C(17) to A.", { x: 0.7, y: 2.65, w: 4.0, h: 0.45, fontSize: 14, color: C.text1 });
card(s, "Review comparison", 5.1, 1.3, 4.4, 1.9);
T(s, "Real issues found (of 9)", { x: 5.3, y: 1.45, w: 4.0, h: 0.3, fontSize: 14, color: C.accent4 });
T(s, [{ text: "AI 8", options: { color: C.accent1 } }, { text: "   tools 3", options: { color: C.accent4 } }], { x: 5.3, y: 1.8, w: 4.0, h: 0.8, fontFace: "Cambria", fontSize: 40, bold: true });
T(s, "Tools caught style; AI caught security.", { x: 5.3, y: 2.65, w: 4.0, h: 0.45, fontSize: 14, color: C.text1 });
T(s, "Three high-severity defects fixed", { x: 0.5, y: 3.45, w: 9.0, h: 0.35, fontSize: 18, bold: true, color: C.text2 });
T(s, [{ text: "Order status was visible to anyone: now needs order number and e-mail", options: { bullet: true, breakLine: true } }, { text: "Product creation was open: now needs an owner token", options: { bullet: true, breakLine: true } }, { text: "Checkout could oversell stock: rows locked (PostgreSQL)", options: { bullet: true } }], { x: 0.5, y: 3.85, w: 9.0, h: 1.1, fontSize: 14, color: C.text1, paraSpaceAfter: 3 });
T(s, "SonarQube before/after: [team to run]. The AI reviewed its own code, so an independent review is still needed.", { x: 0.5, y: 5.0, w: 8.6, h: 0.25, fontSize: 10, color: C.accent4 });
s.addNotes("Pylint went from 8.49 to 10. The AI review found 8 of 9 real issues including three high-severity security defects; the tools found 3 style issues. Caveat: the AI reviewed code it wrote, and SonarQube is for the team to run. About 35 seconds.");

// ---- 9 Demo
pres.addSection({ title: "Results" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Results" });
s.addText("Demo: shop, checkout and chatbot", { placeholder: "title" });
shot(s, "Chatbot screenshot", "screenshots/04_chatbot.png", 0.6, 1.2, 5.6, 3.94);
[["1", "Add to cart, apply SAVE10"], ["2", "Checkout: paid, then declined"], ["3", "Chat: policy, order with e-mail, escalation"]].forEach((r, i) => { const y = 1.4 + i * 1.0; circle(s, r[0], 6.6, y, 0.45); T(s, r[1], { x: 7.2, y: y - 0.02, w: 2.3, h: 0.8, fontSize: 14, color: C.text1 }); });
T(s, "Recorded demo: docs/demo/shopsmart_demo.mp4", { x: 6.6, y: 4.45, w: 2.9, h: 0.6, fontSize: 12, color: C.accent4 });
s.addNotes("Run the live demo or play the recording: add products, apply the coupon, check out with a good and a declined token, then show the chatbot answering a policy question, refusing an order without e-mail, and escalating an unknown question. About 60 seconds.");

// ---- 10 Results
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Results" });
s.addText("Results: three targets met, one gap exposed", { placeholder: "title" });
s.addChart(pres.charts.BAR, [
  { name: "Result", labels: ["Checkout tests", "Chatbot (30 set)", "Chatbot (unseen 20)", "Coverage"], values: [100, 100, 50, 93] },
  { name: "Target", labels: ["Checkout tests", "Chatbot (30 set)", "Chatbot (unseen 20)", "Coverage"], values: [100, 85, 85, 80] }],
  { x: 0.4, y: 1.15, w: 5.4, h: 3.7, barDir: "col", barGrouping: "clustered", chartColors: [HEX.accent1, HEX.accent2], showTitle: true, title: "Result vs target (%)", titleFontFace: "+mn-lt", titleFontSize: 14, titleColor: HEX.dk1,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFontFace: "+mn-lt", dataLabelFontSize: 11, dataLabelColor: HEX.dk1, showLegend: true, legendPos: "b", legendFontFace: "+mn-lt", legendFontSize: 12, legendColor: HEX.dk1,
    catAxisLabelFontFace: "+mn-lt", catAxisLabelFontSize: 11, catAxisLabelColor: HEX.dk1, valAxisHidden: true, valAxisMaxVal: 120, valAxisMinVal: 0, valGridLine: { style: "none" }, catGridLine: { style: "none" } });
const rows = [["Metric", "Status"], ["Checkout 100%", "Met"], ["Chatbot 85% (30 questions)", "Met on set; 50% unseen"], ["Coverage 80%", "Met (93%)"], ["Pipeline green", "Not yet run"]];
s.addTable(rows.map((r, i) => r.map((c) => ({ text: c, options: { bold: i === 0, color: i === 0 ? "FFFFFF" : HEX.dk1, fill: { color: i === 0 ? HEX.dk2 : (i % 2 ? "FFFFFF" : HEX.lt2) }, fontFace: "Calibri", fontSize: 12, valign: "middle" } }))),
  { x: 6.0, y: 1.3, w: 3.5, colW: [1.7, 1.8], rowH: 0.5, border: { type: "solid", color: "D5DDD9", pt: 0.75 } });
T(s, "The 30-question set was tuned; the unseen set is the honest estimate. LLM mode is still to be measured.", { x: 6.0, y: 4.0, w: 3.5, h: 0.9, fontSize: 12, color: C.accent4 });
s.addNotes("Checkout, chatbot on the 30-question set, and coverage meet their targets. But the retriever was tuned on those 30 questions; on 20 unseen paraphrases it scores 50 percent, mostly safe escalations. The pipeline run is still pending. About 40 seconds.");

// ---- 11 Responsible AI
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Results" });
s.addText("Responsible AI: no invented refund terms", { placeholder: "title" });
[["One source of truth", "Refund terms exist only in policy.md"], ["Prompt rule", "Answer only from context, otherwise ESCALATE"], ["Code check", "Any number not in the policy forces a hand-over"], ["Safe fallback", "No key or LLM error: quote policy or escalate"]].forEach((r, i) => {
  const y = 1.25 + i * 0.85; card(s, "Layer " + (i + 1), 0.5, y, 5.6, 0.72); circle(s, i + 1, 0.65, y + 0.14, 0.44);
  T(s, r[0], { x: 1.3, y: y + 0.06, w: 4.7, h: 0.3, fontSize: 16, bold: true, color: C.text2 }); T(s, r[1], { x: 1.3, y: y + 0.37, w: 4.7, h: 0.3, fontSize: 14, color: C.text1 }); });
stat(s, "9 of 12", "logged AI steps needed correction before we accepted them", 6.5, 1.25, 3.0, C.accent3);
T(s, "Open risk: the LLM provider sees the customer's question. Numeric check misses rules without numbers.", { x: 6.5, y: 3.15, w: 3.0, h: 1.3, fontSize: 14, color: C.text1 });
T(s, "AI-usage log and declaration: report chapter 8", { x: 0.5, y: 4.85, w: 9.0, h: 0.3, fontSize: 12, color: C.accent4 });
s.addNotes("Four layers stop the chatbot inventing policy. We logged twelve AI-assisted steps and nine needed correction. Be honest about the open risks: the provider sees the question and the numeric check cannot catch rules without numbers. About 35 seconds.");

// ---- 12 Conclusion
s = pres.addSlide({ masterName: "DARK", sectionTitle: "Results" });
s.addText("Conclusion and Q&A", { placeholder: "title" });
T(s, [{ text: "Outcome", options: { bold: true, color: C.accent2, breakLine: true } }, { text: "Tested shop and a chatbot that escalates instead of guessing", options: { breakLine: true } },
  { text: " ", options: { fontSize: 6, breakLine: true } },
  { text: "What we learned", options: { bold: true, color: C.accent2, breakLine: true } }, { text: "Verify AI output with held-out tests and review, not its own summary", options: { breakLine: true } },
  { text: " ", options: { fontSize: 6, breakLine: true } },
  { text: "Future work", options: { bold: true, color: C.accent2, breakLine: true } }, { text: "1. Measure and raise LLM-mode accuracy", options: { breakLine: true } }, { text: "2. Cart sessions and a concurrency test" }],
  { x: 0.5, y: 1.4, w: 5.8, h: 3.5, fontSize: 16, color: C.background1, paraSpaceAfter: 2 });
s.addShape(pres.ShapeType.roundRect, { objectName: "QR placeholder", x: 6.9, y: 1.5, w: 2.4, h: 2.4, rectRadius: 0.08, fill: { color: C.background1 }, line: { type: "none" } });
T(s, "Repo QR code\n(add after pushing to GitHub)", { x: 6.9, y: 1.5, w: 2.4, h: 2.4, align: "center", valign: "middle", fontSize: 14, color: C.accent4 });
T(s, "github.com/[your-org]/shopsmart", { x: 6.4, y: 4.1, w: 3.4, h: 0.4, align: "center", fontSize: 14, color: C.background2 });
s.addNotes("Close with outcome, learning and two improvements, then take questions. Put the repository QR code in the white box. About 25 seconds.");

(async () => {
  await pres.writeFile({ fileName: "docs/ShopSmart_Presentation.pptx" });
  await applyTheme("docs/ShopSmart_Presentation.pptx", THEME);
  console.log("deck written");
})();
