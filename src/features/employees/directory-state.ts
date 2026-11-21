import {
  DEFAULT_PAGE_SIZE,
  employeeListQuerySchema,
  type EmployeeListQuery,
  type EmployeeSortField,
} from "@/server/employees/employee-list";

/**
 * The directory's state lives in the URL, so views can be bookmarked, shared
 * and reloaded. These pure functions convert between the URL and a query. They
 * reuse the API's own Zod schema so the UI and the server agree on what is valid.
 */

const FILTER_KEYS = ["search", "country", "department", "jobTitle", "currency"] as const;

export type DirectoryChange = Partial<EmployeeListQuery>;

/** Reads the query from the URL. Invalid parameters are dropped, never thrown. */
export function parseDirectoryQuery(params: URLSearchParams): EmployeeListQuery {
  const raw: Record<string, string> = Object.fromEntries(params);

  const first = employeeListQuerySchema.safeParse(raw);
  if (first.success) return first.data;

  // Keep the valid parameters and ignore only the ones that failed validation.
  const invalidKeys = new Set(first.error.issues.map((issue) => String(issue.path[0])));
  const valid = Object.fromEntries(Object.entries(raw).filter(([key]) => !invalidKeys.has(key)));
  const second = employeeListQuerySchema.safeParse(valid);

  return second.success ? second.data : employeeListQuerySchema.parse({});
}

/** Writes only what differs from the defaults, keeping URLs short. */
export function queryToSearchParams(query: EmployeeListQuery): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of FILTER_KEYS) {
    const value = query[key];
    if (value) params.set(key, value);
  }
  if (query.status !== "active") params.set("status", query.status);
  if (query.sortBy !== "fullName") params.set("sortBy", query.sortBy);
  if (query.sortOrder !== "asc") params.set("sortOrder", query.sortOrder);
  if (query.page !== 1) params.set("page", String(query.page));
  if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(query.pageSize));

  return params;
}

/** Applies a change. Anything except a page change sends the user back to page 1. */
export function withChange(query: EmployeeListQuery, change: DirectoryChange): EmployeeListQuery {
  const onlyPageChanged = Object.keys(change).every((key) => key === "page");
  const page = onlyPageChanged ? (change.page ?? query.page) : 1;

  return { ...query, ...change, page };
}

/** Clicking a column sorts by it. Clicking the active column flips the direction. */
export function toggleSort(query: EmployeeListQuery, field: EmployeeSortField): EmployeeListQuery {
  const sortOrder = query.sortBy === field && query.sortOrder === "asc" ? "desc" : "asc";
  return { ...query, sortBy: field, sortOrder, page: 1 };
}

export function hasActiveFilters(query: EmployeeListQuery): boolean {
  return FILTER_KEYS.some((key) => Boolean(query[key])) || query.status !== "active";
}

/** Removes every filter but keeps how the list is sorted. */
export function clearFilters(query: EmployeeListQuery): EmployeeListQuery {
  return {
    status: "active",
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    page: 1,
    pageSize: query.pageSize,
  };
}
