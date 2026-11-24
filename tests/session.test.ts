import { describe, expect, it } from "vitest";
import {
  hashPassword,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from "../src/lib/session.ts";

describe("session and password security", () => {
  it("hashes and verifies passwords with scrypt", () => {
    const hash = hashPassword("SecretPass123!");
    expect(hash).toContain(":");
    expect(verifyPassword("SecretPass123!", hash)).toBe(true);
    expect(verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("signs and verifies Bearer session tokens and rejects tampering", () => {
    const token = signSessionToken({
      id: 7,
      uid: "local:abc",
      email: "user@example.com",
      role: "customer",
    });
    const decoded = verifySessionToken(token);
    expect(decoded?.userId).toBe(7);
    expect(decoded?.email).toBe("user@example.com");

    const tampered = `${token.slice(0, -2)}xx`;
    expect(verifySessionToken(tampered)).toBeNull();
  });
});
