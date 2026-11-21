import { describe, expect, it } from "vitest";
import {
  clearFilters,
  hasActiveFilters,
  parseDirectoryQuery,
  queryToSearchParams,
  toggleSort,
  withChange,
} from "./directory-state";

const DEFAULTS = {
  status: "active",
  sortBy: "fullName",
  sortOrder: "asc",
  page: 1,
  pageSize: 25,
} as const;

describe("parseDirectoryQuery", () => {
  it("uses defaults for an empty URL", () => {
    expect(parseDirectoryQuery(new URLSearchParams(""))).toEqual(DEFAULTS);
  });

  it("reads filters, sort and page from the URL", () => {
    const query = parseDirectoryQuery(
      new URLSearchParams("search=ada&country=Germany&currency=EUR&sortBy=currentSalary&sortOrder=desc&page=3&status=all"),
    );

    expect(query).toMatchObject({
      search: "ada",
      country: "Germany",
      currency: "EUR",
      sortBy: "currentSalary",
      sortOrder: "desc",
      page: 3,
      status: "all",
    });
  });

  it("drops an invalid parameter but keeps the valid ones", () => {
    const query = parseDirectoryQuery(new URLSearchParams("country=Germany&page=abc&sortBy=password"));

    expect(query).toEqual({ ...DEFAULTS, country: "Germany" });
  });

  it("never throws, even for nonsense", () => {
    const query = parseDirectoryQuery(new URLSearchParams("page=-5&pageSize=9999&status=x&currency=1"));

    expect(query).toEqual(DEFAULTS);
  });
});

describe("queryToSearchParams", () => {
  it("leaves out values that equal the defaults", () => {
    expect(queryToSearchParams({ ...DEFAULTS }).toString()).toBe("");
  });

  it("writes only what differs from the defaults", () => {
    const params = queryToSearchParams({
      ...DEFAULTS,
      country: "Germany",
      sortBy: "currentSalary",
      sortOrder: "desc",
      page: 2,
    });

    expect(params.get("country")).toBe("Germany");
    expect(params.get("sortBy")).toBe("currentSalary");
    expect(params.get("sortOrder")).toBe("desc");
    expect(params.get("page")).toBe("2");
    expect(params.has("status")).toBe(false);
    expect(params.has("pageSize")).toBe(false);
  });

  it("keeps a non-default order even when sorting by the default column", () => {
    expect(queryToSearchParams({ ...DEFAULTS, sortOrder: "desc" }).get("sortOrder")).toBe("desc");
  });

  it("round-trips through parseDirectoryQuery", () => {
    const query = { ...DEFAULTS, search: "ada lovelace", jobTitle: "Software Engineer", status: "inactive", page: 4 } as const;

    expect(parseDirectoryQuery(queryToSearchParams(query))).toEqual(query);
  });
});

describe("withChange", () => {
  it("returns to page 1 when a filter changes", () => {
    const query = withChange({ ...DEFAULTS, page: 5 }, { country: "France" });

    expect(query).toMatchObject({ country: "France", page: 1 });
  });

  it("keeps the page when only the page changes", () => {
    expect(withChange({ ...DEFAULTS, page: 5 }, { page: 6 }).page).toBe(6);
  });

  it("removes a filter when it is cleared", () => {
    const query = withChange({ ...DEFAULTS, country: "France" }, { country: undefined });

    expect(query.country).toBeUndefined();
  });
});

describe("toggleSort", () => {
  it("sorts a new column ascending", () => {
    expect(toggleSort({ ...DEFAULTS }, "currentSalary")).toMatchObject({
      sortBy: "currentSalary",
      sortOrder: "asc",
    });
  });

  it("flips the direction when the same column is clicked again", () => {
    const once = toggleSort({ ...DEFAULTS }, "fullName");
    const twice = toggleSort(once, "fullName");

    expect(once.sortOrder).toBe("desc");
    expect(twice.sortOrder).toBe("asc");
  });

  it("returns to page 1", () => {
    expect(toggleSort({ ...DEFAULTS, page: 7 }, "country").page).toBe(1);
  });
});

describe("hasActiveFilters and clearFilters", () => {
  it("is false for the default view", () => {
    expect(hasActiveFilters({ ...DEFAULTS })).toBe(false);
  });

  it.each([
    ["search", { search: "ada" }],
    ["country", { country: "Germany" }],
    ["department", { department: "Sales" }],
    ["job title", { jobTitle: "Recruiter" }],
    ["currency", { currency: "EUR" }],
    ["status", { status: "all" }],
  ] as const)("is true when %s is set", (_label, change) => {
    expect(hasActiveFilters({ ...DEFAULTS, ...change })).toBe(true);
  });

  it("ignores sort and page", () => {
    expect(hasActiveFilters({ ...DEFAULTS, sortBy: "country", page: 3 })).toBe(false);
  });

  it("clears every filter but keeps the sort order", () => {
    const cleared = clearFilters({
      ...DEFAULTS,
      search: "ada",
      country: "Germany",
      status: "all",
      sortBy: "currentSalary",
      sortOrder: "desc",
      page: 4,
    });

    expect(cleared).toEqual({ ...DEFAULTS, sortBy: "currentSalary", sortOrder: "desc" });
  });
});
