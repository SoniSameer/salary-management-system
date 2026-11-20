import { describe, expect, it } from "vitest";
import { EMPLOYEE_SORT_FIELDS, employeeListQuerySchema } from "./employee-list";

describe("employeeListQuerySchema", () => {
  it("applies defaults when nothing is given", () => {
    expect(employeeListQuerySchema.parse({})).toEqual({
      status: "active",
      sortBy: "fullName",
      sortOrder: "asc",
      page: 1,
      pageSize: 25,
    });
  });

  it("parses string query parameters", () => {
    const query = employeeListQuerySchema.parse({
      search: "ada",
      country: "Germany",
      department: "Engineering",
      jobTitle: "Software Engineer",
      currency: "EUR",
      status: "all",
      sortBy: "currentSalary",
      sortOrder: "desc",
      page: "3",
      pageSize: "50",
    });

    expect(query).toEqual({
      search: "ada",
      country: "Germany",
      department: "Engineering",
      jobTitle: "Software Engineer",
      currency: "EUR",
      status: "all",
      sortBy: "currentSalary",
      sortOrder: "desc",
      page: 3,
      pageSize: 50,
    });
  });

  it("treats empty and blank parameters as not provided", () => {
    const query = employeeListQuerySchema.parse({
      search: "   ",
      country: "",
      currency: "",
      page: "",
    });

    expect(query).toEqual({
      status: "active",
      sortBy: "fullName",
      sortOrder: "asc",
      page: 1,
      pageSize: 25,
    });
  });

  it("trims text and upper-cases the currency", () => {
    const query = employeeListQuerySchema.parse({ search: "  ada  ", currency: " eur " });

    expect(query.search).toBe("ada");
    expect(query.currency).toBe("EUR");
  });

  it("ignores parameters it does not know", () => {
    expect(employeeListQuerySchema.safeParse({ utm_source: "x" }).success).toBe(true);
  });

  it.each([
    ["page 0", { page: "0" }],
    ["negative page", { page: "-1" }],
    ["fractional page", { page: "1.5" }],
    ["non-numeric page", { page: "abc" }],
    ["page size 0", { pageSize: "0" }],
    ["page size over the cap", { pageSize: "101" }],
    ["unknown sort field", { sortBy: "id" }],
    ["sort field outside the whitelist", { sortBy: "password" }],
    ["bad sort order", { sortOrder: "sideways" }],
    ["unknown status", { status: "deleted" }],
    ["malformed currency", { currency: "US" }],
    ["over-long search", { search: "x".repeat(101) }],
  ])("rejects %s", (_label, params) => {
    expect(employeeListQuerySchema.safeParse(params).success).toBe(false);
  });

  it("only allows sorting by the documented columns", () => {
    expect(EMPLOYEE_SORT_FIELDS).toEqual([
      "fullName",
      "email",
      "country",
      "department",
      "jobTitle",
      "currentSalary",
      "hiredAt",
    ]);
  });
});
