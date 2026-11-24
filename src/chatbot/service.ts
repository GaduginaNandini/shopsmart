/**
 * Support chatbot: looks up order status and the written policy, then asks Gemini.
 *
 * Responsible-AI rule: the bot must NEVER invent refund (or any) policy. If the
 * written policy has no grounded answer, or the LLM's answer is not grounded in
 * it, the bot escalates to a human instead of guessing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { orders } from "../models.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POLICY_PATH = path.join(__dirname, "policy.md");

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "to", "of", "my", "i", "do", "does", "can", "how", "what",
  "when", "will", "it", "for", "and", "in", "on", "me", "you", "your", "be", "get", "if",
  "after", "before", "so", "this", "that", "with",
]);

const SYNONYMS: Record<string, string> = {
  dispatch: "ship",
  dispatched: "ship",
  shipping: "ship",
  shipped: "ship",
  cancelled: "cancel",
  cancellation: "cancel",
  return: "refund",
  returns: "refund",
  returned: "refund",
};

const GENERIC = new Set(["order", "orders", "item", "items"]);
const SENSITIVE = [
  "refund",
  "money back",
  "compensation",
  "chargeback",
  "legal",
  "lawyer",
  "sue",
];
const MIN_SCORE = 2;

export const ESCALATION =
  "I can't answer that reliably from our written policy, so I'm passing your question " +
  "to a human support agent who will reply by email within 1 business day.";

const SYSTEM_PROMPT =
  "You are ShopSmart's support assistant. Answer ONLY using the CONTEXT below. " +
  "If the context does not contain the answer, reply exactly: ESCALATE. " +
  "Never invent policies, prices, dates, or refund terms. Never ask for card numbers. " +
  "Keep answers under 80 words.";

const ORDER_NOT_FOUND =
  "I couldn't find that order. To check an order, give me the order number and the email " +
  "address used at checkout, for example: order #12 me@example.com";

export interface PolicySection {
  title: string;
  body: string;
}

export interface ChatReply {
  answer: string;
  source: string;
  escalated: boolean;
}

export function loadSections(filePath = POLICY_PATH): PolicySection[] {
  const text = fs.readFileSync(filePath, "utf-8");
  const sections: PolicySection[] = [];
  for (const rawBlock of text.split(/^## /m)) {
    const block = rawBlock.trim();
    if (!block) continue;
    const newlineIdx = block.indexOf("\n");
    if (newlineIdx === -1) {
      sections.push({ title: block.trim(), body: "" });
    } else {
      sections.push({
        title: block.slice(0, newlineIdx).trim(),
        body: block.slice(newlineIdx + 1).trim(),
      });
    }
  }
  return sections;
}

function stem(word: string): string {
  const mapped = SYNONYMS[word] ?? word;
  if (mapped.endsWith("us") || mapped.endsWith("ss")) {
    return mapped;
  }
  if (mapped.endsWith("uses")) {
    return mapped.slice(0, -2);
  }
  for (const suffix of ["ing", "ed", "es", "s"]) {
    if (mapped.endsWith(suffix) && mapped.length - suffix.length >= 4) {
      return mapped.slice(0, -suffix.length);
    }
  }
  return mapped;
}

const STEMMED_GENERIC = new Set(Array.from(GENERIC).map(stem));

function tokens(text: string): Set<string> {
  const matches = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const result = new Set<string>();
  for (const w of matches) {
    if (STOPWORDS.has(w)) continue;
    const s = stem(w);
    if (!STEMMED_GENERIC.has(s)) {
      result.add(s);
    }
  }
  return result;
}

function intersectCount(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const item of a) {
    if (b.has(item)) count++;
  }
  return count;
}

export function retrieve(
  question: string,
  sections?: PolicySection[],
  k = 2
): Array<{ score: number; title: string; body: string }> {
  const secs = sections ?? loadSections();
  const qTokens = tokens(question);
  const scored: Array<{ score: number; title: string; body: string }> = [];
  for (const { title, body } of secs) {
    const score =
      intersectCount(qTokens, tokens(title)) * 2 +
      intersectCount(qTokens, tokens(body));
    if (score >= MIN_SCORE) {
      scored.push({ score, title, body });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export function findOrderId(question: string): number | null {
  const match = question.match(/(?:order\s*(?:no\.?|number|id)?\s*#?\s*|#)(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function findEmail(question: string): string | null {
  const match = question.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return match ? match[0].toLowerCase() : null;
}

export function numbersGrounded(text: string, policy: string): boolean {
  const allowed = new Set(policy.match(/\d+/g) ?? []);
  const found = text.match(/\d+/g) ?? [];
  return found.every((n) => allowed.has(n));
}

export async function callLlm(
  system: string,
  context: string,
  question: string
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(key)}`;
  const prompt = `${system}\n\nCONTEXT:\n${context}\n\nQUESTION: ${question}`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      return null;
    }
    const data = (await resp.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? text.trim() : null;
  } catch {
    return null;
  }
}

function reply(text: string, source: string, escalated = false): ChatReply {
  return { answer: text, source, escalated };
}

function escalate(): ChatReply {
  return reply(ESCALATION, "escalation", true);
}

function orderAnswer(orderId: number, email: string | null): ChatReply {
  const order = orders.get(orderId);
  if (!order || !email || order.email.toLowerCase() !== email) {
    return reply(ORDER_NOT_FOUND, "orders");
  }
  return reply(
    `Order #${order.id} is currently ${order.status}. Total: ${order.total}.`,
    "orders"
  );
}

async function llmAnswer(
  question: string,
  llm: typeof callLlm
): Promise<ChatReply | null> {
  const policy = loadSections()
    .map((s) => `${s.title}: ${s.body}`)
    .join("\n\n");
  const text = await llm(SYSTEM_PROMPT, policy, question);
  if (text === null) {
    return null;
  }
  if (text.toUpperCase().includes("ESCALATE") || !numbersGrounded(text, policy)) {
    return escalate();
  }
  return reply(text, "llm+policy");
}

function offlineAnswer(question: string): ChatReply {
  const hits = retrieve(question);
  if (hits.length === 0) {
    return escalate();
  }
  const lower = question.toLowerCase();
  if (SENSITIVE.some((w) => lower.includes(w))) {
    const qTokens = tokens(question);
    const hasTitleOverlap = hits.some(
      (h) => intersectCount(qTokens, tokens(h.title)) > 0
    );
    if (!hasTitleOverlap) {
      return escalate();
    }
  }
  return reply(hits[0].body, "policy");
}

export async function answer(
  questionInput: string | undefined | null,
  llm: typeof callLlm = callLlm
): Promise<ChatReply> {
  const question = (questionInput ?? "").trim();
  if (!question) {
    return reply("Please type a question.", "none");
  }
  const orderId = findOrderId(question);
  if (orderId !== null) {
    return orderAnswer(orderId, findEmail(question));
  }
  const fromLlm = await llmAnswer(question, llm);
  return fromLlm ?? offlineAnswer(question);
}
