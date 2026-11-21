import { describe, expect, it } from "vitest";
import { ApiRequestError, type EmployeeDto } from "./api-client";
import {
  emptyFormValues,
  fieldErrorsFromApi,
  hasChanges,
  parseSalary,
  prepareCreate,
  prepareEdit,
  valuesFromEmployee,
  type EmployeeFormValues,
} from "./employee-form";

const VALID: EmployeeFormValues = {
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  country: "Germany",
  department: "Engineering",
  jobTitle: "Software Engineer",
  currency: "EUR",
  salary: "70000",
  hiredAt: "2024-01-15",
};

const EMPLOYEE: EmployeeDto = {
  id: "f4856dc2-08f7-4b6c-8148-fa7069a3fdbf",
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  country: "Germany",
  department: "Engineering",
  jobTitle: "Software Engineer",
  currency: "EUR",
  currentSalary: 70000,
  isActive: true,
  hiredAt: "2024-01-15T00:00:00.000Z",
  deactivatedAt: null,
};

describe("parseSalary", () => {
  it.each([
    ["70000", 70000],
    ["70,000", 70000],
    ["1 850 000", 1850000],
    ["  70000  ", 70000],
    ["70000.5", 70000.5],
  ])("reads %j as %s", (text, expected) => {
    expect(parseSalary(text)).toBe(expected);
  });

  it.each([[""], ["   "], ["abc"], ["1e3"], ["-5"], ["12abc"], ["0x10"]])(
    "treats %j as not a number",
    (text) => {
      expect(parseSalary(text)).toBeNaN();
    },
  );
});

describe("prepareCreate", () => {
  it("accepts valid values and builds the payload", () => {
    expect(prepareCreate(VALID)).toEqual({
      ok: true,
      payload: {
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        country: "Germany",
        department: "Engineering",
        jobTitle: "Software Engineer",
        currency: "EUR",
        salary: 70000,
        hiredAt: "2024-01-15",
      },
    });
  });

  it("trims text and accepts a salary typed with separators", () => {
    const result = prepareCreate({ ...VALID, fullName: "  Ada Lovelace ", salary: "70,000" });

    expect(result).toMatchObject({ ok: true, payload: { fullName: "Ada Lovelace", salary: 70000 } });
  });

  it("reports every problem at once, with plain messages", () => {
    const result = prepareCreate({
      ...emptyFormValues(),
      email: "nope",
      salary: "abc",
      hiredAt: "2023-02-30",
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        fullName: "This field is required",
        email: "Enter a valid email address",
        country: "This field is required",
        department: "This field is required",
        jobTitle: "This field is required",
        currency: "Use a 3-letter ISO currency code, for example USD",
        salary: "Enter a salary",
        hiredAt: "Enter a valid date",
      },
    });
  });

  it.each([
    ["zero", "0", "Enter a salary above zero"],
    ["a fraction", "100.5", "Use a whole number"],
    ["too large", "3000000000", "That amount is too large"],
  ])("rejects a salary that is %s", (_label, salary, message) => {
    expect(prepareCreate({ ...VALID, salary })).toMatchObject({
      ok: false,
      errors: { salary: message },
    });
  });
});

describe("valuesFromEmployee", () => {
  it("converts an employee into form values", () => {
    expect(valuesFromEmployee(EMPLOYEE)).toEqual(VALID);
  });
});

describe("hasChanges", () => {
  it("is false when nothing changed", () => {
    expect(hasChanges(EMPLOYEE, valuesFromEmployee(EMPLOYEE))).toBe(false);
  });

  it("ignores surrounding spaces and email capitalisation", () => {
    const values = { ...valuesFromEmployee(EMPLOYEE), fullName: " Ada Lovelace ", email: "ADA@example.com" };

    expect(hasChanges(EMPLOYEE, values)).toBe(false);
  });

  it("is true when an editable field changed", () => {
    expect(hasChanges(EMPLOYEE, { ...valuesFromEmployee(EMPLOYEE), jobTitle: "Staff Engineer" })).toBe(true);
  });

  it("does not look at salary or currency, which are not editable here", () => {
    const values = { ...valuesFromEmployee(EMPLOYEE), salary: "99999", currency: "USD" };

    expect(hasChanges(EMPLOYEE, values)).toBe(false);
  });
});

describe("prepareEdit", () => {
  it("is unchanged when nothing differs", () => {
    expect(prepareEdit(EMPLOYEE, valuesFromEmployee(EMPLOYEE))).toEqual({ kind: "unchanged" });
  });

  it("sends only the fields that changed", () => {
    const values = { ...valuesFromEmployee(EMPLOYEE), jobTitle: " Staff Engineer ", country: "France" };

    expect(prepareEdit(EMPLOYEE, values)).toEqual({
      kind: "ready",
      patch: { jobTitle: "Staff Engineer", country: "France" },
    });
  });

  it("never sends salary or currency", () => {
    const values = { ...valuesFromEmployee(EMPLOYEE), salary: "1", currency: "USD", fullName: "Ada King" };

    expect(prepareEdit(EMPLOYEE, values)).toEqual({ kind: "ready", patch: { fullName: "Ada King" } });
  });

  it("explains a field that was cleared or made invalid", () => {
    const values = { ...valuesFromEmployee(EMPLOYEE), fullName: "  ", email: "nope" };

    expect(prepareEdit(EMPLOYEE, values)).toEqual({
      kind: "invalid",
      errors: { fullName: "This field is required", email: "Enter a valid email address" },
    });
  });
});

describe("fieldErrorsFromApi", () => {
  it("puts a field error on its field and keeps no general message", () => {
    const error = new ApiRequestError("An employee with this email already exists", 409, "email_already_exists", {
      email: ["This email is already in use"],
    });

    expect(fieldErrorsFromApi(error)).toEqual({
      fieldErrors: { email: "This email is already in use" },
      general: undefined,
    });
  });

  it("uses the message as a general error when no field is named", () => {
    const error = new ApiRequestError("Something went wrong", 500, "internal_error");

    expect(fieldErrorsFromApi(error)).toEqual({ fieldErrors: {}, general: "Something went wrong" });
  });

  it("keeps a general message when the API names a field the form does not have", () => {
    const error = new ApiRequestError("Some fields are invalid", 400, "validation_failed", {
      somethingElse: ["Bad"],
    });

    expect(fieldErrorsFromApi(error)).toEqual({ fieldErrors: {}, general: "Some fields are invalid" });
  });
});
