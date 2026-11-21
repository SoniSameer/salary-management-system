import { describe, expect, it } from "vitest";
import type { SalaryRecordDto } from "./api-client";
import { buildHistoryRows, formatChange } from "./salary-history";

function record(overrides: Partial<SalaryRecordDto> & { id: string; amount: number }): SalaryRecordDto {
  return {
    employeeId: "e1",
    currency: "EUR",
    effectiveAt: "2024-01-01T00:00:00.000Z",
    reason: null,
    ...overrides,
  };
}

describe("buildHistoryRows", () => {
  it("gives the oldest record no change, because there is nothing before it", () => {
    const rows = buildHistoryRows([record({ id: "a", amount: 70000, reason: "Starting salary" })]);

    expect(rows).toEqual([
      {
        id: "a",
        effectiveAt: "2024-01-01T00:00:00.000Z",
        amount: 70000,
        currency: "EUR",
        reason: "Starting salary",
        change: null,
      },
    ]);
  });

  it("compares each record with the one before it, in a newest-first list", () => {
    const rows = buildHistoryRows([
      record({ id: "c", amount: 90000 }),
      record({ id: "b", amount: 80000 }),
      record({ id: "a", amount: 70000 }),
    ]);

    expect(rows.map((row) => row.change)).toEqual([
      { amount: 10000, percent: 12.5 },
      { amount: 10000, percent: 14.3 },
      null,
    ]);
  });

  it("shows a pay cut as a negative change", () => {
    const rows = buildHistoryRows([record({ id: "b", amount: 63000 }), record({ id: "a", amount: 70000 })]);

    expect(rows[0].change).toEqual({ amount: -7000, percent: -10 });
  });

  it("never compares across currencies", () => {
    const rows = buildHistoryRows([
      record({ id: "b", amount: 90000, currency: "USD" }),
      record({ id: "a", amount: 70000, currency: "EUR" }),
    ]);

    expect(rows[0].change).toBeNull();
  });

  it("keeps the order it was given", () => {
    const rows = buildHistoryRows([record({ id: "b", amount: 2 }), record({ id: "a", amount: 1 })]);

    expect(rows.map((row) => row.id)).toEqual(["b", "a"]);
  });

  it("returns nothing for an empty history", () => {
    expect(buildHistoryRows([])).toEqual([]);
  });

  it("rounds the percentage to one decimal place", () => {
    const rows = buildHistoryRows([record({ id: "b", amount: 100 }), record({ id: "a", amount: 30 })]);

    expect(rows[0].change?.percent).toBe(233.3);
  });
});

describe("formatChange", () => {
  it("shows a raise with a plus sign, the amount in the currency, and the percentage", () => {
    expect(formatChange({ amount: 8000, percent: 11.4 }, "EUR")).toBe("+€8,000 (+11.4%)");
  });

  it("shows a pay cut with a minus sign", () => {
    expect(formatChange({ amount: -5000, percent: -7.1 }, "USD")).toBe("-$5,000 (-7.1%)");
  });

  it("uses the employee's own currency", () => {
    expect(formatChange({ amount: 500000, percent: 5 }, "JPY")).toBe("+¥500,000 (+5%)");
  });

  it("shows a dash when there is nothing to compare with", () => {
    expect(formatChange(null, "EUR")).toBe("–");
  });
});
