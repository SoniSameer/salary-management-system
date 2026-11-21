import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DistributionResult, InsightsResult } from "@/server/insights/insights";
import { apiError, jsonResponse, mockEmployeeApi } from "@/test/mock-api";
import { navigationLog, setUrl } from "@/test/mock-navigation";
import { InsightsDashboard } from "./insights-dashboard";

vi.mock("next/navigation", async () => (await import("@/test/mock-navigation")).navigationModule);

afterEach(() => {
  vi.unstubAllGlobals();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const CURRENCIES = [
  { currency: "USD", headcount: 2343 },
  { currency: "EUR", headcount: 1894 },
];

const USD: InsightsResult = {
  currency: "USD",
  overall: { headcount: 2343, min: 41_500, average: 94_400, median: 86_500, max: 202_500 },
  byCountry: [{ name: "United States", headcount: 2343, min: 41_500, average: 94_400, median: 86_500, max: 202_500 }],
  byJobTitle: [
    { name: "Software Engineer", headcount: 300, min: 60_000, average: 101_000, median: 98_000, max: 150_000 },
    { name: "Account Executive", headcount: 280, min: 50_000, average: 82_000, median: 80_000, max: 120_000 },
  ],
};

const EUR: InsightsResult = {
  currency: "EUR",
  overall: { headcount: 1894, min: 35_000, average: 77_000, median: 72_500, max: 173_500 },
  byCountry: [
    { name: "Germany", headcount: 1131, min: 37_000, average: 82_000, median: 76_500, max: 173_500 },
    { name: "France", headcount: 763, min: 35_000, average: 69_000, median: 66_000, max: 166_500 },
  ],
  byJobTitle: [{ name: "Software Engineer", headcount: 250, min: 45_000, average: 90_000, median: 88_000, max: 140_000 }],
};

const USD_BUCKETS: DistributionResult = {
  currency: "USD",
  buckets: [
    { from: 40_000, to: 60_000, count: 500 },
    { from: 60_000, to: 80_000, count: 800 },
    { from: 80_000, to: 100_000, count: 600 },
    { from: 100_000, to: 120_000, count: 443 },
  ],
};

const EUR_BUCKETS: DistributionResult = {
  currency: "EUR",
  buckets: [
    { from: 20_000, to: 40_000, count: 200 },
    { from: 40_000, to: 60_000, count: 900 },
    { from: 60_000, to: 80_000, count: 794 },
  ],
};

interface Overrides {
  currencies?: () => Response;
  insights?: (currency: string) => Response | Promise<Response>;
  distribution?: (currency: string) => Response | Promise<Response>;
}

function serve(overrides: Overrides = {}) {
  return mockEmployeeApi({
    custom: (request, url) => {
      const currency = url.searchParams.get("currency") ?? "";
      if (request.path === "/api/insights/currencies") {
        return overrides.currencies ? overrides.currencies() : jsonResponse({ currencies: CURRENCIES });
      }
      if (request.path === "/api/insights/distribution") {
        if (overrides.distribution) return overrides.distribution(currency);
        return jsonResponse(currency === "EUR" ? EUR_BUCKETS : USD_BUCKETS);
      }
      if (request.path === "/api/insights") {
        if (overrides.insights) return overrides.insights(currency);
        return jsonResponse(currency === "EUR" ? EUR : USD);
      }
      return undefined;
    },
  });
}

function renderDashboard(search = "") {
  setUrl(search, "/insights");
  return render(<InsightsDashboard />);
}

describe("InsightsDashboard: loading and the default currency", () => {
  it("shows a loading state, then the insights", async () => {
    const gate = deferred<Response>();
    serve({ insights: () => gate.promise });

    renderDashboard();

    expect(await screen.findByRole("status")).toHaveTextContent(/loading insights/i);
    gate.resolve(jsonResponse(USD));
    expect(await screen.findByRole("region", { name: "Summary" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("starts with the currency that has the most employees", async () => {
    const api = serve();

    renderDashboard();

    await screen.findByRole("region", { name: "Summary" });
    expect(screen.getByLabelText("Currency")).toHaveValue("USD");
    expect(api.fetchMock.mock.calls.some(([url]) => String(url) === "/api/insights?currency=USD")).toBe(true);
    expect(api.fetchMock.mock.calls.some(([url]) => String(url).includes("currency=EUR"))).toBe(false);
  });

  it("lists every currency with its headcount", async () => {
    serve();

    renderDashboard();

    await screen.findByRole("region", { name: "Summary" });
    expect(screen.getByRole("option", { name: "USD (2,343 employees)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "EUR (1,894 employees)" })).toBeInTheDocument();
  });

  it("uses the currency in the URL, whatever its case", async () => {
    serve();

    renderDashboard("?currency=eur");

    await screen.findByRole("region", { name: "Summary" });
    expect(screen.getByLabelText("Currency")).toHaveValue("EUR");
    expect(screen.getByRole("heading", { name: "Summary for EUR" })).toBeInTheDocument();
  });

  it("ignores a malformed currency in the URL and uses the default", async () => {
    serve();

    renderDashboard("?currency=12");

    await screen.findByRole("region", { name: "Summary" });
    expect(screen.getByLabelText("Currency")).toHaveValue("USD");
  });
});

describe("InsightsDashboard: the figures", () => {
  it("shows the summary in the chosen currency", async () => {
    serve();

    renderDashboard();

    const summary = await screen.findByRole("region", { name: "Summary" });
    expect(within(summary).getByText("2,343")).toBeInTheDocument();
    expect(within(summary).getByText("$94,400")).toBeInTheDocument();
    expect(within(summary).getByText("$86,500")).toBeInTheDocument();
    expect(within(summary).getByText("$41,500")).toBeInTheDocument();
    expect(within(summary).getByText("$202,500")).toBeInTheDocument();
    for (const label of ["Employees", "Average salary", "Median salary", "Lowest salary", "Highest salary"]) {
      expect(within(summary).getByText(label)).toBeInTheDocument();
    }
  });

  it("says that currencies are never combined or converted", async () => {
    serve();

    renderDashboard();

    const note = await screen.findByRole("note");
    expect(note).toHaveTextContent(/active employees paid in USD/i);
    expect(note).toHaveTextContent(/never combined or converted/i);
  });

  it("breaks salaries down by country, in the order the API gives", async () => {
    serve();

    renderDashboard("?currency=EUR");

    const table = await screen.findByRole("table", { name: "Salary by country" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Germany")).toBeInTheDocument();
    expect(within(rows[0]).getByText("1,131")).toBeInTheDocument();
    expect(within(rows[0]).getByText("€37,000")).toBeInTheDocument();
    expect(within(rows[0]).getByText("€82,000")).toBeInTheDocument();
    expect(within(rows[0]).getByText("€76,500")).toBeInTheDocument();
    expect(within(rows[0]).getByText("€173,500")).toBeInTheDocument();
    expect(within(rows[1]).getByText("France")).toBeInTheDocument();
  });

  it("breaks salaries down by job title", async () => {
    serve();

    renderDashboard();

    const table = await screen.findByRole("table", { name: "Salary by job title" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Software Engineer")).toBeInTheDocument();
    expect(within(rows[0]).getByText("$98,000")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Account Executive")).toBeInTheDocument();
  });

  it("labels the columns of both tables", async () => {
    serve();

    renderDashboard();

    for (const tableName of ["Salary by country", "Salary by job title"]) {
      const table = await screen.findByRole("table", { name: tableName });
      for (const name of ["Employees", "Lowest", "Average", "Median", "Highest"]) {
        expect(within(table).getByRole("columnheader", { name })).toBeInTheDocument();
      }
    }
    expect(screen.getByRole("columnheader", { name: "Country" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Job title" })).toBeInTheDocument();
  });
});

describe("InsightsDashboard: the distribution chart", () => {
  it("states the most common pay range in words", async () => {
    serve();

    renderDashboard();

    expect(
      await screen.findByText("Most common pay range: $60,000 to $79,999, with 800 employees (34% of 2,343)."),
    ).toBeInTheDocument();
  });

  it("gives the chart a text alternative", async () => {
    serve();

    renderDashboard();

    const chart = await screen.findByRole("img", { name: /^Salary distribution in USD/ });
    expect(chart).toHaveAccessibleName(
      "Salary distribution in USD: 2,343 employees in 4 pay ranges from $40,000 to $119,999. The most common range is $60,000 to $79,999 with 800 employees.",
    );
  });

  it("offers the same data as a table", async () => {
    const user = userEvent.setup();
    serve();
    renderDashboard();
    await screen.findByRole("img", { name: /^Salary distribution/ });

    await user.click(screen.getByText("Show data table"));

    const table = screen.getByRole("table", { name: "Salary distribution data" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(4);
    expect(within(rows[1]).getByText("$60,000 to $79,999")).toBeInTheDocument();
    expect(within(rows[1]).getByText("800")).toBeInTheDocument();
  });
});

describe("InsightsDashboard: changing currency", () => {
  it("moves to the chosen currency through the URL and loads its figures", async () => {
    const user = userEvent.setup();
    const api = serve();
    renderDashboard();
    await screen.findByRole("region", { name: "Summary" });

    await user.selectOptions(screen.getByLabelText("Currency"), "EUR");

    expect(navigationLog.pushes.at(-1)).toBe("/insights?currency=EUR");
    const summary = await screen.findByRole("heading", { name: "Summary for EUR" });
    expect(summary).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Summary" })).getByText("€77,000")).toBeInTheDocument();
    expect(api.fetchMock.mock.calls.some(([url]) => String(url) === "/api/insights?currency=EUR")).toBe(true);
    expect(api.fetchMock.mock.calls.some(([url]) => String(url) === "/api/insights/distribution?currency=EUR")).toBe(true);
    expect(screen.getByRole("table", { name: "Salary by country" })).toHaveTextContent("Germany");
  });

  it("never shows the old currency's figures while the new ones load", async () => {
    const user = userEvent.setup();
    const eur = deferred<Response>();
    serve({ insights: (currency) => (currency === "EUR" ? eur.promise : jsonResponse(USD)) });
    renderDashboard();
    await screen.findByText("$94,400", { selector: "dd" });

    await user.selectOptions(screen.getByLabelText("Currency"), "EUR");

    // Dollar figures must be gone at once, not left on screen under a euro heading.
    expect(screen.queryByText("$94,400")).not.toBeInTheDocument();
    expect(screen.queryByText("United States")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/loading insights/i);
    eur.resolve(jsonResponse(EUR));
    expect(await screen.findByText("€77,000")).toBeInTheDocument();
  });

  it("keeps the selector usable while loading", async () => {
    const user = userEvent.setup();
    const eur = deferred<Response>();
    serve({ insights: (currency) => (currency === "EUR" ? eur.promise : jsonResponse(USD)) });
    renderDashboard();
    await screen.findByRole("region", { name: "Summary" });

    await user.selectOptions(screen.getByLabelText("Currency"), "EUR");

    expect(screen.getByLabelText("Currency")).toBeEnabled();
    expect(screen.getByLabelText("Currency")).toHaveValue("EUR");
  });
});

describe("InsightsDashboard: empty and failure states", () => {
  it("explains there is nothing to analyse when there are no employees", async () => {
    serve({ currencies: () => jsonResponse({ currencies: [] }) });

    renderDashboard();

    expect(await screen.findByText("No employees yet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Currency")).not.toBeInTheDocument();
  });

  it("explains a currency that nobody active is paid in", async () => {
    serve({
      insights: (currency) => jsonResponse({ currency, overall: null, byCountry: [], byJobTitle: [] }),
      distribution: (currency) => jsonResponse({ currency, buckets: [] }),
    });

    renderDashboard("?currency=GBP");

    expect(await screen.findByText("No active employees are paid in GBP.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Summary" })).not.toBeInTheDocument();
  });

  it("shows the server's message and retries when the insights fail", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    serve({
      insights: () => {
        attempts += 1;
        return attempts === 1 ? apiError(500, "internal_error", "Something went wrong") : jsonResponse(USD);
      },
    });

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Summary" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a failure to load the currencies and retries", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    serve({
      currencies: () => {
        attempts += 1;
        return attempts === 1 ? apiError(500, "internal_error", "Something went wrong") : jsonResponse({ currencies: CURRENCIES });
      },
    });

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Summary" })).toBeInTheDocument();
  });

  it("explains a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach the server/i);
  });

  it("still shows the figures if only the chart data fails", async () => {
    serve({ distribution: () => apiError(500, "internal_error", "Chart data is unavailable") });

    renderDashboard();

    expect(await screen.findByRole("region", { name: "Summary" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Chart data is unavailable"));
    expect(screen.getByRole("table", { name: "Salary by country" })).toBeInTheDocument();
  });
});
