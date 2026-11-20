import { describe, expect, it } from "vitest";
import { changeSalarySchema } from "./salary-schemas";

describe("changeSalarySchema", () => {
  it("accepts a salary on its own", () => {
    expect(changeSalarySchema.parse({ salary: 80000 })).toEqual({ salary: 80000 });
  });

  it("accepts and trims a reason", () => {
    const result = changeSalarySchema.parse({ salary: 80000, reason: "  Promotion  " });

    expect(result).toEqual({ salary: 80000, reason: "Promotion" });
  });

  it("treats a blank reason as no reason", () => {
    const result = changeSalarySchema.parse({ salary: 80000, reason: "   " });

    expect(result.reason).toBeUndefined();
  });

  it.each([
    ["missing salary", {}],
    ["zero", { salary: 0 }],
    ["negative", { salary: -1 }],
    ["fractional", { salary: 10.5 }],
    ["text", { salary: "80000" }],
    ["above the maximum", { salary: 2_000_000_000 }],
    ["over-long reason", { salary: 80000, reason: "x".repeat(201) }],
  ])("rejects %s", (_label, body) => {
    expect(changeSalarySchema.safeParse(body).success).toBe(false);
  });

  it("does not let the caller choose the currency or date", () => {
    expect(changeSalarySchema.safeParse({ salary: 80000, currency: "USD" }).success).toBe(false);
    expect(changeSalarySchema.safeParse({ salary: 80000, effectiveAt: "2020-01-01" }).success).toBe(
      false,
    );
  });
});
