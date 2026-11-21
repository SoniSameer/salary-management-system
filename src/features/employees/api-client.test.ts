import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, fetchEmployees, fetchFilterOptions } from "./api-client";

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
