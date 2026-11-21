import { describe, expect, it } from "vitest";
import { prepareSalaryChange } from "./salary-change-form";

describe("prepareSalaryChange", () => {
  it("builds a payload from a valid salary", () => {
    expect(prepareSalaryChange(70000, { salary: "80000", reason: "" })).toEqual({
      ok: true,
      payload: { salary: 80000 },
    });
  });

  it("includes a trimmed reason when one is given", () => {
    expect(prepareSalaryChange(70000, { salary: "80,000", reason: "  Promotion  " })).toEqual({
      ok: true,
      payload: { salary: 80000, reason: "Promotion" },
    });
  });

  it("leaves a blank reason out", () => {
    const result = prepareSalaryChange(70000, { salary: "80000", reason: "   " });

    expect(result).toEqual({ ok: true, payload: { salary: 80000 } });
  });

  it("allows a pay cut", () => {
    expect(prepareSalaryChange(70000, { salary: "60000", reason: "" })).toMatchObject({ ok: true });
  });

  it.each([
    ["empty", "", "Enter a salary"],
    ["not a number", "abc", "Enter a salary"],
    ["zero", "0", "Enter a salary above zero"],
    ["a fraction", "100.5", "Use a whole number"],
    ["too large", "3000000000", "That amount is too large"],
  ])("rejects a salary that is %s", (_label, salary, message) => {
    expect(prepareSalaryChange(70000, { salary, reason: "" })).toEqual({
      ok: false,
      errors: { salary: message },
    });
  });

  it("asks for a different amount when the salary is unchanged, before calling the server", () => {
    expect(prepareSalaryChange(70000, { salary: "70,000", reason: "" })).toEqual({
      ok: false,
      errors: { salary: "Enter a different amount from the current salary" },
    });
  });

  it("rejects a reason that is too long", () => {
    const result = prepareSalaryChange(70000, { salary: "80000", reason: "x".repeat(201) });

    expect(result).toEqual({ ok: false, errors: { reason: "Use 200 characters or fewer" } });
  });

  it("reports the salary and the reason together", () => {
    const result = prepareSalaryChange(70000, { salary: "", reason: "x".repeat(201) });

    expect(result).toEqual({
      ok: false,
      errors: { salary: "Enter a salary", reason: "Use 200 characters or fewer" },
    });
  });
});
