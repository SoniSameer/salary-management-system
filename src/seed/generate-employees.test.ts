import { describe, expect, it } from "vitest";
import { COUNTRIES, generateEmployees } from "./generate-employees";

const countryByName = new Map(COUNTRIES.map((c) => [c.name, c]));

describe("generateEmployees", () => {
  it("is deterministic for the same seed", () => {
    expect(generateEmployees(200, 42)).toEqual(generateEmployees(200, 42));
  });

  it("produces different data for a different seed", () => {
    expect(generateEmployees(50, 1)).not.toEqual(generateEmployees(50, 2));
  });

  it("generates the requested number of employees", () => {
    expect(generateEmployees(10_000, 7)).toHaveLength(10_000);
  });

  it("generates unique ids and emails", () => {
    const employees = generateEmployees(2_000, 7);

    expect(new Set(employees.map((e) => e.id)).size).toBe(2_000);
    expect(new Set(employees.map((e) => e.email)).size).toBe(2_000);
  });

  it("uses ASCII, lower-case, well-formed emails", () => {
    for (const { email } of generateEmployees(500, 7)) {
      expect(email).toMatch(/^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]+$/);
    }
  });

  it("assigns each employee the currency of their country", () => {
    for (const e of generateEmployees(1_000, 7)) {
      expect(e.currency).toBe(countryByName.get(e.country)?.currency);
    }
  });

  it("covers several countries and currencies", () => {
    const employees = generateEmployees(2_000, 7);

    expect(new Set(employees.map((e) => e.country)).size).toBe(COUNTRIES.length);
    expect(new Set(employees.map((e) => e.currency)).size).toBeGreaterThanOrEqual(6);
  });

  it("gives every employee positive whole-number salaries", () => {
    for (const e of generateEmployees(1_000, 7)) {
      expect(Number.isInteger(e.currentSalary)).toBe(true);
      expect(e.currentSalary).toBeGreaterThan(0);
      for (const record of e.salaryHistory) {
        expect(Number.isInteger(record.amount)).toBe(true);
        expect(record.amount).toBeGreaterThan(0);
      }
    }
  });

  it("starts salary history on the hire date and keeps it in date order", () => {
    for (const e of generateEmployees(1_000, 7)) {
      expect(e.salaryHistory[0].effectiveAt).toEqual(e.hiredAt);
      for (let i = 1; i < e.salaryHistory.length; i++) {
        expect(e.salaryHistory[i].effectiveAt.getTime()).toBeGreaterThan(
          e.salaryHistory[i - 1].effectiveAt.getTime(),
        );
      }
    }
  });

  it("keeps current salary equal to the latest history record", () => {
    for (const e of generateEmployees(1_000, 7)) {
      expect(e.currentSalary).toBe(e.salaryHistory.at(-1)?.amount);
    }
  });

  it("includes some employees with raises, and raises increase pay", () => {
    const employees = generateEmployees(1_000, 7);
    const withRaises = employees.filter((e) => e.salaryHistory.length > 1);

    expect(withRaises.length).toBeGreaterThan(100);
    for (const e of withRaises) {
      expect(e.currentSalary).toBeGreaterThan(e.salaryHistory[0].amount);
    }
  });

  it("deactivates a minority of employees and dates the deactivation", () => {
    const employees = generateEmployees(2_000, 7);
    const inactive = employees.filter((e) => !e.isActive);

    expect(inactive.length).toBeGreaterThan(0);
    expect(inactive.length / employees.length).toBeLessThan(0.15);
    for (const e of employees) {
      if (e.isActive) {
        expect(e.deactivatedAt).toBeNull();
      } else {
        expect(e.deactivatedAt).not.toBeNull();
        expect(e.deactivatedAt!.getTime()).toBeGreaterThan(e.hiredAt.getTime());
      }
    }
  });

  it("pairs each job title with its department", () => {
    const departmentsByTitle = new Map<string, Set<string>>();
    for (const e of generateEmployees(1_000, 7)) {
      const set = departmentsByTitle.get(e.jobTitle) ?? new Set<string>();
      set.add(e.department);
      departmentsByTitle.set(e.jobTitle, set);
    }

    for (const departments of departmentsByTitle.values()) {
      expect(departments.size).toBe(1);
    }
  });
});
