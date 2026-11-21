import { describe, expect, it } from "vitest";
import { z } from "zod";
import { insightsQuerySchema } from "./insights-schemas";

describe("insightsQuerySchema", () => {
  it("accepts a currency code", () => {
    expect(insightsQuerySchema.parse({ currency: "EUR" })).toEqual({ currency: "EUR" });
  });

  it("normalises the currency", () => {
    expect(insightsQuerySchema.parse({ currency: " eur " }).currency).toBe("EUR");
  });

  it("ignores other parameters", () => {
    expect(insightsQuerySchema.parse({ currency: "EUR", utm_source: "x" })).toEqual({ currency: "EUR" });
  });

  it.each([
    ["missing", {}, "Choose a currency"],
    ["empty", { currency: "" }, "Choose a currency"],
    ["blank", { currency: "   " }, "Choose a currency"],
    ["too short", { currency: "EU" }, "Use a 3-letter ISO currency code, for example USD"],
    ["too long", { currency: "EURO" }, "Use a 3-letter ISO currency code, for example USD"],
    ["not letters", { currency: "123" }, "Use a 3-letter ISO currency code, for example USD"],
  ])("rejects a currency that is %s", (_label, params, message) => {
    const result = insightsQuerySchema.safeParse(params);

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors: Record<string, string[] | undefined> = z.flattenError(result.error).fieldErrors;
      expect(fieldErrors.currency?.[0]).toBe(message);
    }
  });
});
