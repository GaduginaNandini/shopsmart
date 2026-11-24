import { describe, expect, it } from "vitest";
import { cartTotal, lineTotal, money } from "../src/pricing.ts";

describe("pricing rules", () => {
  it("rounds money half-up to 2 decimal places", () => {
    expect(money("10.005")).toBe("10.01");
    expect(money("10.004")).toBe("10.00");
    expect(money(50)).toBe("50.00");
  });

  it("calculates standard line totals without bulk discount below 10 units", () => {
    expect(lineTotal("50.00", 1)).toBe("50.00");
    expect(lineTotal("50.00", 9)).toBe("450.00");
  });

  it("applies 5% bulk discount for 10 or more units of a product (R1)", () => {
    expect(lineTotal("50.00", 10)).toBe("475.00");
    expect(lineTotal("120.00", 10)).toBe("1140.00");
  });

  it("rejects negative quantities", () => {
    expect(() => lineTotal("50.00", -1)).toThrow("quantity must be >= 0");
  });

  it("applies SAVE10 coupon after bulk discount (R2 & R3)", () => {
    expect(cartTotal([["50.00", 10]], "SAVE10")).toBe("427.50");
    expect(cartTotal([["50.00", 10]], "save10")).toBe("427.50");
  });

  it("rejects unknown coupon codes", () => {
    expect(() => cartTotal([["50.00", 1]], "BADCODE")).toThrow(
      "invalid coupon"
    );
  });
});
