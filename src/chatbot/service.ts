/**
 * Support chatbot: looks up order status in PostgreSQL and written policy, then asks Gemini.
 *
 * Responsible-AI rule: the bot must NEVER invent refund (or any) policy. If the
 * written policy has no grounded answer, or the LLM's answer is not grounded in
 * it, the bot escalates to a human instead of guessing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { createSupportTicket, getOrderById } from "../db/repository.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POLICY_PATH = path.join(__dirname, "policy.md");

const GEMINI_MODEL = "gemini-4-hydrogen";

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

export type LlmClientFn = (
  system: string,
  context: string,
  question: string
) => Promise<string | null>;

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
  try {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `CONTEXT:\n${context}\n\nQUESTION: ${question}`,
      config: {
        systemInstruction: system,
      },
    });
    const text = response.text?.trim();
    return text || null;
  } catch (err) {
    console.warn("Gemini call failed, falling back to policy retrieval:", err);
    return null;
  }
}

function reply(text: string, source: string, escalated = false): ChatReply {
  return { answer: text, source, escalated };
}

async function escalate(
  question: string,
  email?: string | null,
  persistTicket = true
): Promise<ChatReply> {
  if (persistTicket) {
    await createSupportTicket(question, email);
  }
  return reply(ESCALATION, "escalation", true);
}

async function orderAnswer(
  orderId: number,
  email: string | null,
  authenticatedEmail?: string | null
): Promise<ChatReply> {
  const effectiveEmail = email ?? authenticatedEmail ?? null;
  const order = await getOrderById(orderId);
  if (
    !order ||
    !effectiveEmail ||
    order.email.toLowerCase() !== effectiveEmail.toLowerCase()
  ) {
    return reply(ORDER_NOT_FOUND, "orders");
  }
  return reply(
    `Order #${order.id} is currently ${order.status}. Total: ${order.total}.`,
    "orders"
  );
}

async function llmAnswer(
  question: string,
  llm: LlmClientFn,
  email?: string | null,
  persistTicket = true
): Promise<ChatReply | null> {
  const policy = loadSections()
    .map((s) => `${s.title}: ${s.body}`)
    .join("\n\n");
  const text = await llm(SYSTEM_PROMPT, policy, question);
  if (text === null) {
    return null;
  }
  if (text.toUpperCase().includes("ESCALATE") || !numbersGrounded(text, policy)) {
    return await escalate(question, email, persistTicket);
  }
  return reply(text, "llm+policy");
}

async function offlineAnswer(
  question: string,
  email?: string | null,
  persistTicket = true
): Promise<ChatReply> {
  const hits = retrieve(question);
  if (hits.length === 0) {
    return await escalate(question, email, persistTicket);
  }
  const lower = question.toLowerCase();
  if (SENSITIVE.some((w) => lower.includes(w))) {
    const qTokens = tokens(question);
    const hasTitleOverlap = hits.some(
      (h) => intersectCount(qTokens, tokens(h.title)) > 0
    );
    if (!hasTitleOverlap) {
      return await escalate(question, email, persistTicket);
    }
  }
  return reply(hits[0].body, "policy");
}

export async function answer(
  questionInput: string | undefined | null,
  options?: {
    llm?: LlmClientFn;
    authenticatedEmail?: string | null;
    persistTicket?: boolean;
  }
): Promise<ChatReply> {
  const question = (questionInput ?? "").trim();
  const llm = options?.llm ?? callLlm;
  const persistTicket = options?.persistTicket ?? true;

  if (!question) {
    return reply("Please type a question.", "none");
  }

  const orderId = findOrderId(question);
  if (orderId !== null) {
    return await orderAnswer(
      orderId,
      findEmail(question),
      options?.authenticatedEmail
    );
  }

  const emailInQuestion = findEmail(question) ?? options?.authenticatedEmail ?? null;
  const fromLlm = await llmAnswer(question, llm, emailInQuestion, persistTicket);
  if (fromLlm) return fromLlm;
  return await offlineAnswer(question, emailInQuestion, persistTicket);
}
