import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCurrencies, fetchDistribution, fetchInsights } from "./api-client";

function respondWith(body: unknown, init: ResponseInit = {}) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCurrencies", () => {
  it("returns the list unwrapped from the response", async () => {
    const fetchMock = respondWith({ currencies: [{ currency: "EUR", headcount: 5 }] });

    const result = await fetchCurrencies();

    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/insights/currencies");
    expect(result).toEqual([{ currency: "EUR", headcount: 5 }]);
  });
});

describe("fetchInsights", () => {
  it("asks for one currency", async () => {
    const fetchMock = respondWith({ currency: "EUR", overall: null, byCountry: [], byJobTitle: [] });

    await fetchInsights("EUR");

    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/insights?currency=EUR");
  });

  it("passes the abort signal", async () => {
    const fetchMock = respondWith({ currency: "EUR", overall: null, byCountry: [], byJobTitle: [] });
    const controller = new AbortController();

    await fetchInsights("EUR", controller.signal);

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal: controller.signal });
  });

  it("surfaces the API's message when the request fails", async () => {
    respondWith({ error: { code: "validation_failed", message: "Choose a currency" } }, { status: 400 });

    await expect(fetchInsights("")).rejects.toMatchObject({ status: 400, message: "Choose a currency" });
  });
});

describe("fetchDistribution", () => {
  it("asks for one currency", async () => {
    const fetchMock = respondWith({ currency: "JPY", buckets: [] });

    const result = await fetchDistribution("JPY");

    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/insights/distribution?currency=JPY");
    expect(result.currency).toBe("JPY");
  });
});
