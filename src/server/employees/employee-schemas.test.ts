import { describe, expect, it } from "vitest";
import {
  createEmployeeSchema,
  employeeIdSchema,
  updateEmployeeSchema,
} from "./employee-schemas";

const validCreate = {
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  country: "Germany",
  department: "Engineering",
  jobTitle: "Software Engineer",
  currency: "EUR",
  salary: 70000,
  hiredAt: "2024-01-15",
};

describe("createEmployeeSchema", () => {
  it("accepts a valid employee", () => {
    const result = createEmployeeSchema.safeParse(validCreate);

    expect(result.success).toBe(true);
  });

  it("normalizes text, email, currency and the hire date", () => {
    const result = createEmployeeSchema.parse({
      ...validCreate,
      fullName: "  Ada Lovelace  ",
      email: "  Ada@Example.COM ",
      currency: "eur",
    });

    expect(result.fullName).toBe("Ada Lovelace");
    expect(result.email).toBe("ada@example.com");
    expect(result.currency).toBe("EUR");
    expect(result.hiredAt).toEqual(new Date("2024-01-15T00:00:00.000Z"));
  });

  it.each([
    ["empty name", { fullName: "   " }],
    ["invalid email", { email: "not-an-email" }],
    ["empty department", { department: "" }],
    ["two-letter currency", { currency: "US" }],
    ["numeric currency", { currency: "123" }],
    ["zero salary", { salary: 0 }],
    ["negative salary", { salary: -100 }],
    ["fractional salary", { salary: 1000.5 }],
    ["salary as text", { salary: "70000" }],
    ["salary above the maximum", { salary: 2_000_000_000 }],
    ["malformed date", { hiredAt: "15/01/2024" }],
    ["impossible date", { hiredAt: "2023-02-30" }],
  ])("rejects %s", (_label, override) => {
    const result = createEmployeeSchema.safeParse({ ...validCreate, ...override });

    expect(result.success).toBe(false);
  });

  it("rejects a missing field", () => {
    const withoutEmail: Partial<typeof validCreate> = { ...validCreate };
    delete withoutEmail.email;

    expect(createEmployeeSchema.safeParse(withoutEmail).success).toBe(false);
  });
});

describe("updateEmployeeSchema", () => {
  it("accepts a partial update", () => {
    const result = updateEmployeeSchema.parse({ jobTitle: "Senior Software Engineer" });

    expect(result).toEqual({ jobTitle: "Senior Software Engineer" });
  });

  it("rejects an empty update", () => {
    expect(updateEmployeeSchema.safeParse({}).success).toBe(false);
  });

  it("rejects attempts to change salary or currency here", () => {
    expect(updateEmployeeSchema.safeParse({ salary: 90000 }).success).toBe(false);
    expect(updateEmployeeSchema.safeParse({ currentSalary: 90000 }).success).toBe(false);
    expect(updateEmployeeSchema.safeParse({ currency: "USD" }).success).toBe(false);
  });

  it("applies the same field rules as create", () => {
    expect(updateEmployeeSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(updateEmployeeSchema.safeParse({ fullName: "" }).success).toBe(false);
  });
});

describe("employeeIdSchema", () => {
  it("accepts a UUID and rejects anything else", () => {
    expect(employeeIdSchema.safeParse("f4856dc2-08f7-4b6c-8148-fa7069a3fdbf").success).toBe(true);
    expect(employeeIdSchema.safeParse("123").success).toBe(false);
  });
});
