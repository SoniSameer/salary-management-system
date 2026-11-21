import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiRequestError,
  changeSalary,
  createEmployee,
  deactivateEmployee,
  fetchEmployeeDetails,
  fetchEmployees,
  fetchFilterOptions,
  updateEmployee,
} from "./api-client";

const QUERY = {
  status: "active",
  sortBy: "fullName",
  sortOrder: "asc",
  page: 1,
  pageSize: 25,
} as const;

function respondWith(body: unknown, init: ResponseInit = {}) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
      ...init,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchEmployees", () => {
  it("requests the list with the query as URL parameters", async () => {
    const fetchMock = respondWith({ items: [], total: 0, page: 1, pageSize: 25, totalPages: 0 });

    await fetchEmployees({ ...QUERY, country: "Germany", currency: "EUR", page: 2 });

    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost");
    expect(url.pathname).toBe("/api/employees");
    expect(url.searchParams.get("country")).toBe("Germany");
    expect(url.searchParams.get("currency")).toBe("EUR");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("returns the parsed page", async () => {
    respondWith({ items: [], total: 3, page: 1, pageSize: 25, totalPages: 1 });

    const result = await fetchEmployees(QUERY);

    expect(result).toMatchObject({ total: 3, totalPages: 1 });
  });

  it("passes the abort signal to fetch", async () => {
    const fetchMock = respondWith({ items: [], total: 0, page: 1, pageSize: 25, totalPages: 0 });
    const controller = new AbortController();

    await fetchEmployees(QUERY, controller.signal);

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal: controller.signal });
  });

  it("reads the message from an API error body", async () => {
    respondWith(
      { error: { code: "validation_failed", message: "Some fields are invalid" } },
      { status: 400 },
    );

    await expect(fetchEmployees(QUERY)).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 400,
      code: "validation_failed",
      message: "Some fields are invalid",
    });
  });

  it("gives a plain message when the error body is not JSON", async () => {
    respondWith("<html>Bad gateway</html>", { status: 502 });

    const error = await fetchEmployees(QUERY).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).message).toBe("The server returned an error (502).");
  });

  it("explains a network failure in plain words", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(fetchEmployees(QUERY)).rejects.toMatchObject({
      message: "Could not reach the server. Check your connection and try again.",
    });
  });

  it("lets an aborted request through untouched so callers can ignore it", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abort));

    await expect(fetchEmployees(QUERY)).rejects.toBe(abort);
  });
});

const EMPLOYEE = {
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

const NEW_EMPLOYEE = {
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  country: "Germany",
  department: "Engineering",
  jobTitle: "Software Engineer",
  currency: "EUR",
  salary: 70000,
  hiredAt: "2024-01-15",
};

describe("createEmployee", () => {
  it("posts the employee as JSON and returns the created employee", async () => {
    const fetchMock = respondWith(EMPLOYEE, { status: 201 });

    const created = await createEmployee(NEW_EMPLOYEE);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/employees");
    expect(init).toMatchObject({ method: "POST" });
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual(NEW_EMPLOYEE);
    expect(created.id).toBe(EMPLOYEE.id);
  });

  it("exposes per-field errors from the API", async () => {
    respondWith(
      {
        error: {
          code: "email_already_exists",
          message: "An employee with this email already exists",
          fields: { email: ["This email is already in use"] },
        },
      },
      { status: 409 },
    );

    const error = (await createEmployee(NEW_EMPLOYEE).catch((e: unknown) => e)) as ApiRequestError;

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.status).toBe(409);
    expect(error.fields).toEqual({ email: ["This email is already in use"] });
  });

  it("has no field errors for a failure without them", async () => {
    respondWith({ error: { code: "internal_error", message: "Something went wrong" } }, { status: 500 });

    const error = (await createEmployee(NEW_EMPLOYEE).catch((e: unknown) => e)) as ApiRequestError;

    expect(error.fields).toEqual({});
  });
});

describe("updateEmployee", () => {
  it("sends only the given fields with PATCH", async () => {
    const fetchMock = respondWith({ ...EMPLOYEE, jobTitle: "Staff Engineer" });

    const updated = await updateEmployee(EMPLOYEE.id, { jobTitle: "Staff Engineer" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/employees/${EMPLOYEE.id}`);
    expect(init).toMatchObject({ method: "PATCH" });
    expect(JSON.parse(init.body)).toEqual({ jobTitle: "Staff Engineer" });
    expect(updated.jobTitle).toBe("Staff Engineer");
  });
});

describe("deactivateEmployee", () => {
  it("posts to the deactivate endpoint", async () => {
    const fetchMock = respondWith({ ...EMPLOYEE, isActive: false });

    const result = await deactivateEmployee(EMPLOYEE.id);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/employees/${EMPLOYEE.id}/deactivate`);
    expect(init).toMatchObject({ method: "POST" });
    expect(result.isActive).toBe(false);
  });
});

describe("fetchEmployeeDetails", () => {
  it("returns the employee with salary history", async () => {
    const fetchMock = respondWith({ employee: EMPLOYEE, salaryHistory: [] });

    const details = await fetchEmployeeDetails(EMPLOYEE.id);

    expect(String(fetchMock.mock.calls[0][0])).toBe(`/api/employees/${EMPLOYEE.id}`);
    expect(details.employee.fullName).toBe("Ada Lovelace");
  });

  it("reports a missing employee as a 404 the caller can recognise", async () => {
    respondWith({ error: { code: "not_found", message: "Employee not found" } }, { status: 404 });

    await expect(fetchEmployeeDetails(EMPLOYEE.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("changeSalary", () => {
  it("posts the new salary and reason, and returns the updated employee and new record", async () => {
    const record = {
      id: "r1",
      employeeId: EMPLOYEE.id,
      amount: 78000,
      currency: "EUR",
      effectiveAt: "2026-05-20T09:30:00.000Z",
      reason: "Promotion",
    };
    const fetchMock = respondWith({ employee: { ...EMPLOYEE, currentSalary: 78000 }, record }, { status: 201 });

    const result = await changeSalary(EMPLOYEE.id, { salary: 78000, reason: "Promotion" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/employees/${EMPLOYEE.id}/salary`);
    expect(init).toMatchObject({ method: "POST" });
    expect(JSON.parse(init.body)).toEqual({ salary: 78000, reason: "Promotion" });
    expect(result.employee.currentSalary).toBe(78000);
    expect(result.record.reason).toBe("Promotion");
  });

  it("exposes the API's code so the caller can react to a conflict", async () => {
    respondWith(
      { error: { code: "salary_changed_concurrently", message: "This employee was changed by someone else. Reload and try again" } },
      { status: 409 },
    );

    await expect(changeSalary(EMPLOYEE.id, { salary: 1 })).rejects.toMatchObject({
      status: 409,
      code: "salary_changed_concurrently",
    });
  });
});

describe("fetchFilterOptions", () => {
  it("returns the filter options", async () => {
    const fetchMock = respondWith({
      countries: ["Germany"],
      departments: ["Sales"],
      jobTitles: ["Recruiter"],
      currencies: ["EUR"],
    });

    const options = await fetchFilterOptions();

    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/employees/filter-options");
    expect(options.countries).toEqual(["Germany"]);
  });
});
