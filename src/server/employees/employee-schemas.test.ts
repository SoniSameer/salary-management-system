import { describe, expect, it } from "vitest";
import { z } from "zod";
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

describe("createEmployeeSchema error messages", () => {
  // The same messages reach the API response and the form, so they are written
  // for the HR manager, not for developers.
  function messageFor(field: string, override: Record<string, unknown>): string | undefined {
    const result = createEmployeeSchema.safeParse({ ...validCreate, ...override });
    if (result.success) throw new Error("expected validation to fail");
    const fieldErrors: Record<string, string[] | undefined> = z.flattenError(result.error).fieldErrors;
    return fieldErrors[field]?.[0];
  }

  it.each([
    ["fullName", { fullName: "   " }, "This field is required"],
    ["fullName", { fullName: "x".repeat(121) }, "Use 120 characters or fewer"],
    ["email", { email: "not-an-email" }, "Enter a valid email address"],
    ["email", { email: "" }, "Enter a valid email address"],
    ["currency", { currency: "US" }, "Use a 3-letter ISO currency code, for example USD"],
    ["salary", { salary: 0 }, "Enter a salary above zero"],
    ["salary", { salary: -5 }, "Enter a salary above zero"],
    ["salary", { salary: 10.5 }, "Use a whole number"],
    ["salary", { salary: Number.NaN }, "Enter a salary"],
    ["salary", { salary: 2_000_000_000 }, "That amount is too large"],
    ["hiredAt", { hiredAt: "2023-02-30" }, "Enter a valid date"],
    ["hiredAt", { hiredAt: "" }, "Enter a valid date"],
  ])("explains a bad %s in plain words", (field, override, expected) => {
    expect(messageFor(field, override)).toBe(expected);
  });
});

describe("employeeIdSchema", () => {
  it("accepts a UUID and rejects anything else", () => {
    expect(employeeIdSchema.safeParse("f4856dc2-08f7-4b6c-8148-fa7069a3fdbf").success).toBe(true);
    expect(employeeIdSchema.safeParse("123").success).toBe(false);
  });
});
