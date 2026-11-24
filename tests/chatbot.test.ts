import { describe, expect, it, vi } from "vitest";

vi.mock("../src/db/repository.ts", () => ({
  getOrderById: vi.fn(async (orderId: number) => {
    if (orderId === 12) {
      return {
        id: 12,
        email: "alice@example.com",
        status: "SHIPPED",
        total: "450.00",
      };
    }
    return null;
  }),
  createSupportTicket: vi.fn(async (question: string, email?: string | null) => ({
    id: 1,
    question,
    email: email ?? null,
    status: "OPEN",
  })),
}));

import {
  answer,
  ESCALATION,
  findEmail,
  findOrderId,
  loadSections,
  numbersGrounded,
  retrieve,
} from "../src/chatbot/service.ts";

describe("chatbot service", () => {
  it("loads policy sections from policy.md", () => {
    const sections = loadSections();
    expect(sections.length).toBeGreaterThanOrEqual(5);
    expect(sections.some((s) => s.title === "Shipping")).toBe(true);
  });

  it("extracts order id and email correctly", () => {
    expect(findOrderId("Where is order #12 alice@example.com?")).toBe(12);
    expect(findOrderId("Check #42")).toBe(42);
    expect(findOrderId("What is your shipping policy?")).toBeNull();
    expect(findEmail("Check order #12 Alice@Example.com")).toBe(
      "alice@example.com"
    );
  });

  it("verifies numeric grounding against policy text", () => {
    const policy = "Shipping takes 3 to 7 business days. Free above 999 INR.";
    expect(numbersGrounded("Delivery takes 3 to 7 business days.", policy)).toBe(
      true
    );
    expect(numbersGrounded("Refund within 30 days.", policy)).toBe(false);
  });

  it("retrieves relevant policy sections offline", () => {
    const hits = retrieve("How long does shipping take?");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].title).toBe("Shipping");
  });

  it("answers empty messages cleanly", async () => {
    const res = await answer("   ", { persistTicket: false });
    expect(res.source).toBe("none");
    expect(res.escalated).toBe(false);
  });

  it("reveals order status only when email matches", async () => {
    const ok = await answer("order #12 alice@example.com", {
      persistTicket: false,
    });
    expect(ok.source).toBe("orders");
    expect(ok.answer).toContain("Order #12 is currently SHIPPED");

    const wrongEmail = await answer("order #12 bob@example.com", {
      persistTicket: false,
    });
    expect(wrongEmail.source).toBe("orders");
    expect(wrongEmail.answer).toContain("couldn't find that order");
  });

  it("falls back to policy.md when LLM returns null", async () => {
    const res = await answer("How long does shipping take?", {
      llm: async () => null,
      persistTicket: false,
    });
    expect(res.source).toBe("policy");
    expect(res.escalated).toBe(false);
    expect(res.answer).toContain("2 business days");
  });

  it("escalates when LLM hallucinates ungrounded numbers or emits ESCALATE", async () => {
    const ungrounded = await answer("What is the refund window?", {
      llm: async () => "You have 90 days to return items.",
      persistTicket: false,
    });
    expect(ungrounded.escalated).toBe(true);
    expect(ungrounded.answer).toBe(ESCALATION);

    const explicitEscalate = await answer("Do you sell Mars tickets?", {
      llm: async () => "ESCALATE",
      persistTicket: false,
    });
    expect(explicitEscalate.escalated).toBe(true);
  });

  it("uses LLM answer when grounded in policy", async () => {
    const grounded = await answer("When is shipping free?", {
      llm: async () => "Shipping is free on orders above 999 INR.",
      persistTicket: false,
    });
    expect(grounded.source).toBe("llm+policy");
    expect(grounded.escalated).toBe(false);
  });
});
