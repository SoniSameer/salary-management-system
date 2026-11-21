import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatNumber } from "./format";

describe("formatMoney", () => {
  it.each([
    [70000, "USD", "$70,000"],
    [70000, "EUR", "€70,000"],
    [70000, "GBP", "£70,000"],
    [8000000, "JPY", "¥8,000,000"],
    // One fixed locale for every currency, so digits group the same way in a column.
    [1850000, "INR", "₹1,850,000"],
    [90000, "BRL", "R$90,000"],
    [125000, "AUD", "A$125,000"],
  ])("formats %s %s as %s", (amount, currency, expected) => {
    expect(formatMoney(amount, currency)).toBe(expected);
  });

  it("never shows decimals, because salaries are whole units", () => {
    expect(formatMoney(70000, "USD")).not.toContain(".");
  });

  it("shows the code and amount for a currency without a symbol", () => {
    // Intl uses a non-breaking space here, which keeps the code and amount on one line.
    expect(formatMoney(5000, "ZZZ")).toBe("ZZZ\u00a05,000");
  });

  it("falls back for a malformed currency code instead of throwing", () => {
    expect(formatMoney(5000, "not-a-code")).toBe("not-a-code 5,000");
  });
});

describe("formatDate", () => {
  it("formats an ISO date", () => {
    expect(formatDate("2024-01-15T00:00:00.000Z")).toBe("Jan 15, 2024");
  });

  it("uses UTC, so a date does not move to the previous day", () => {
    expect(formatDate("2024-03-01T00:00:00.000Z")).toBe("Mar 1, 2024");
  });

  it("returns a dash for a missing or invalid date", () => {
    expect(formatDate(null)).toBe("–");
    expect(formatDate("not a date")).toBe("–");
  });
});

describe("formatNumber", () => {
  it("adds thousands separators", () => {
    expect(formatNumber(9505)).toBe("9,505");
  });
});
