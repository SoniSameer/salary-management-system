import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, employeeDto, listDto, mockEmployeeApi } from "@/test/mock-api";
import { navigationLog, setUrl } from "@/test/mock-navigation";
import type { EmployeeListDto } from "../api-client";
import { EmployeeDirectory } from "./employee-directory";

vi.mock("next/navigation", async () => (await import("@/test/mock-navigation")).navigationModule);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function renderDirectory(search = "") {
  setUrl(search);
  return render(<EmployeeDirectory />);
}

const ada = employeeDto();
const chen = employeeDto({
  id: "b3a1f0de-7c2e-4f6a-9d11-2c8e5a7b9f10",
  fullName: "Chen Wei",
  email: "chen@example.com",
  country: "Japan",
  department: "Sales",
  jobTitle: "Account Executive",
  currency: "JPY",
  currentSalary: 8000000,
  hiredAt: "2022-03-01T00:00:00.000Z",
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EmployeeDirectory: data states", () => {
  it("shows a loading state, then the employees", async () => {
    const gate = deferred<EmployeeListDto>();
    mockEmployeeApi({ list: () => gate.promise });

    renderDirectory();

    expect(screen.getByRole("status")).toHaveTextContent(/loading employees/i);
    gate.resolve(listDto([ada]));
    expect(await screen.findByRole("link", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(screen.queryByText(/loading employees/i)).not.toBeInTheDocument();
  });

  it("shows each employee's details with salary in their own currency", async () => {
    mockEmployeeApi({ list: () => listDto([ada, chen]) });

    renderDirectory();

    const row = (await screen.findByRole("link", { name: "Ada Lovelace" })).closest("tr")!;
    expect(within(row).getByText("ada@example.com")).toBeInTheDocument();
    expect(within(row).getByText("Germany")).toBeInTheDocument();
    expect(within(row).getByText("Engineering")).toBeInTheDocument();
    expect(within(row).getByText("Software Engineer")).toBeInTheDocument();
    expect(within(row).getByText("Jan 15, 2024")).toBeInTheDocument();
    expect(within(row).getByText("€70,000")).toBeInTheDocument();
    expect(within(row).getByText("EUR")).toBeInTheDocument();
    expect(within(row).getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("¥8,000,000")).toBeInTheDocument();
  });

  it("links each name to the employee's page", async () => {
    mockEmployeeApi({ list: () => listDto([ada]) });

    renderDirectory();

    expect(await screen.findByRole("link", { name: "Ada Lovelace" })).toHaveAttribute(
      "href",
      `/employees/${ada.id}`,
    );
  });

  it("gives each row an Edit link that names the employee", async () => {
    mockEmployeeApi({ list: () => listDto([ada, chen]) });

    renderDirectory();

    expect(await screen.findByRole("link", { name: "Edit Ada Lovelace" })).toHaveAttribute(
      "href",
      `/employees/${ada.id}/edit`,
    );
    expect(screen.getByRole("link", { name: "Edit Chen Wei" })).toHaveAttribute(
      "href",
      `/employees/${chen.id}/edit`,
    );
  });

  it("labels deactivated employees in words, not only colour", async () => {
    mockEmployeeApi({
      list: () => listDto([employeeDto({ isActive: false, deactivatedAt: "2025-01-01T00:00:00.000Z" })]),
    });

    renderDirectory("?status=all");

    // Scoped to the table: the Status dropdown also has an "Inactive" option.
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Inactive")).toBeInTheDocument();
  });

  it("summarises how many employees are shown", async () => {
    mockEmployeeApi({ list: () => listDto([ada, chen], { total: 9505, totalPages: 381 }) });

    renderDirectory();

    expect(await screen.findByText("Showing 1–2 of 9,505 employees")).toBeInTheDocument();
  });

  it("explains an empty directory", async () => {
    mockEmployeeApi({ list: () => listDto([]) });

    renderDirectory();

    expect(await screen.findByText("No employees yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("offers a way back when filters hide everyone", async () => {
    const user = userEvent.setup();
    const api = mockEmployeeApi({
      list: (url) => (url.searchParams.has("country") ? listDto([]) : listDto([ada])),
    });
    renderDirectory("?country=Atlantis");

    expect(await screen.findByText("No employees match your filters")).toBeInTheDocument();
    // One "Clear filters" in the filter bar, and a differently named action here.
    expect(screen.getAllByRole("button", { name: "Clear filters" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Show all employees" }));

    expect(await screen.findByRole("link", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(api.lastListCall().searchParams.has("country")).toBe(false);
    expect(navigationLog.pushes.at(-1)).toBe("/employees");
  });

  it("offers a way back when the page is past the end of the list", async () => {
    const user = userEvent.setup();
    mockEmployeeApi({
      list: (url) =>
        url.searchParams.get("page") === "99"
          ? listDto([], { total: 40, totalPages: 2, page: 99 })
          : listDto([ada], { total: 40, totalPages: 2 }),
    });
    renderDirectory("?page=99");

    expect(await screen.findByText("This page is past the end of the list")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Go to the first page" }));

    expect(navigationLog.pushes.at(-1)).toBe("/employees");
    expect(await screen.findByRole("link", { name: "Ada Lovelace" })).toBeInTheDocument();
  });

  it("shows the server's message and retries after an error", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    mockEmployeeApi({
      list: () => {
        attempts += 1;
        return attempts === 1
          ? apiError(500, "internal_error", "Something went wrong")
          : listDto([ada]);
      },
    });

    renderDirectory();

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("link", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    renderDirectory();

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach the server/i);
  });

  it("still lists employees when the filter options fail to load", async () => {
    mockEmployeeApi({
      list: () => listDto([ada]),
      options: () => apiError(500, "internal_error", "Something went wrong"),
    });

    renderDirectory();

    expect(await screen.findByRole("link", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(await screen.findByText(/filter lists could not be loaded/i)).toBeInTheDocument();
  });

  it("keeps the current rows visible while the next page loads", async () => {
    const user = userEvent.setup();
    const next = deferred<EmployeeListDto>();
    mockEmployeeApi({
      list: (url) =>
        url.searchParams.get("page") === "2"
          ? next.promise
          : listDto([ada], { total: 40, totalPages: 2 }),
    });
    renderDirectory();
    await screen.findByRole("link", { name: "Ada Lovelace" });

    await user.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    next.resolve(listDto([chen], { total: 40, totalPages: 2, page: 2 }));
    expect(await screen.findByRole("link", { name: "Chen Wei" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "false");
  });

  it("ignores a slow response that arrives after a newer one", async () => {
    const user = userEvent.setup();
    const france = deferred<EmployeeListDto>();
    const germany = deferred<EmployeeListDto>();
    mockEmployeeApi({
      list: (url) => {
        const country = url.searchParams.get("country");
        if (country === "France") return france.promise;
        if (country === "Germany") return germany.promise;
        return listDto([ada, chen]);
      },
    });
    renderDirectory();
    await screen.findByRole("option", { name: "France" });

    await user.selectOptions(screen.getByLabelText("Country"), "France");
    await user.selectOptions(screen.getByLabelText("Country"), "Germany");
    germany.resolve(listDto([ada]));
    expect(await screen.findByText("Showing 1–1 of 1 employee")).toBeInTheDocument();
    // The earlier France request finishes last. It must not replace Germany.
    france.resolve(listDto([chen]));
    await Promise.resolve();

    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Chen Wei" })).not.toBeInTheDocument();
  });
});

describe("EmployeeDirectory: filters and search", () => {
  beforeEach(() => {
    mockEmployeeApi({ list: () => listDto([ada]) });
  });

  it("fills the filter dropdowns from the API", async () => {
    renderDirectory();

    expect(await screen.findByRole("option", { name: "Germany" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Software Engineer" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "JPY" })).toBeInTheDocument();
  });

  it("reflects the URL in the controls", async () => {
    renderDirectory("?country=Germany&currency=EUR&search=ada");

    await screen.findByRole("option", { name: "Germany" });
    expect(screen.getByLabelText("Country")).toHaveValue("Germany");
    expect(screen.getByLabelText("Currency")).toHaveValue("EUR");
    expect(screen.getByLabelText("Search")).toHaveValue("ada");
  });

  it("filters by country through the URL and requests only that country", async () => {
    const user = userEvent.setup();
    const api = mockEmployeeApi({ list: () => listDto([ada]) });
    renderDirectory();
    await screen.findByRole("option", { name: "Germany" });

    await user.selectOptions(screen.getByLabelText("Country"), "Germany");

    expect(navigationLog.pushes.at(-1)).toBe("/employees?country=Germany");
    await screen.findByRole("link", { name: "Ada Lovelace" });
    expect(api.lastListCall().searchParams.get("country")).toBe("Germany");
  });

  it("returns to page 1 when a filter changes", async () => {
    const user = userEvent.setup();
    renderDirectory("?page=3");
    await screen.findByRole("option", { name: "Germany" });

    await user.selectOptions(screen.getByLabelText("Currency"), "EUR");

    expect(navigationLog.pushes.at(-1)).toBe("/employees?currency=EUR");
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    renderDirectory();
    await screen.findByRole("option", { name: "Germany" });

    await user.selectOptions(screen.getByLabelText("Status"), "All");

    expect(navigationLog.pushes.at(-1)).toBe("/employees?status=all");
  });

  it("searches when the form is submitted", async () => {
    const user = userEvent.setup();
    const api = mockEmployeeApi({ list: () => listDto([ada]) });
    renderDirectory();
    await screen.findByRole("link", { name: "Ada Lovelace" });

    await user.type(screen.getByLabelText("Search"), "  ada  {Enter}");

    expect(navigationLog.pushes.at(-1)).toBe("/employees?search=ada");
    await screen.findByRole("link", { name: "Ada Lovelace" });
    expect(api.lastListCall().searchParams.get("search")).toBe("ada");
  });

  it("does not search on every keystroke", async () => {
    const user = userEvent.setup();
    const api = mockEmployeeApi({ list: () => listDto([ada]) });
    renderDirectory();
    await screen.findByRole("link", { name: "Ada Lovelace" });
    const callsBefore = api.listCalls.length;

    await user.type(screen.getByLabelText("Search"), "ada");

    expect(api.listCalls.length).toBe(callsBefore);
  });

  it("shows Clear filters only when something is filtered", async () => {
    renderDirectory();
    await screen.findByRole("link", { name: "Ada Lovelace" });
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("shows Clear filters when a filter is set", async () => {
    renderDirectory("?department=Sales");
    await screen.findByRole("link", { name: "Ada Lovelace" });
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });
});

describe("EmployeeDirectory: sorting", () => {
  beforeEach(() => {
    mockEmployeeApi({ list: () => listDto([ada, chen]) });
  });

  it("marks the current sort column for assistive technology", async () => {
    renderDirectory();

    await screen.findByRole("link", { name: "Ada Lovelace" });

    expect(screen.getByRole("columnheader", { name: /^Name/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(screen.getByRole("columnheader", { name: /^Country/ })).not.toHaveAttribute("aria-sort");
  });

  it("sorts by a column on click, then flips the direction", async () => {
    const user = userEvent.setup();
    renderDirectory();
    await screen.findByRole("link", { name: "Ada Lovelace" });

    await user.click(screen.getByRole("button", { name: /Salary/ }));
    expect(navigationLog.pushes.at(-1)).toBe("/employees?sortBy=currentSalary");
    expect(screen.getByRole("columnheader", { name: /^Salary/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    await user.click(screen.getByRole("button", { name: /Salary/ }));
    expect(navigationLog.pushes.at(-1)).toBe("/employees?sortBy=currentSalary&sortOrder=desc");
    expect(screen.getByRole("columnheader", { name: /^Salary/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  it("warns that salaries in different currencies cannot be compared", async () => {
    renderDirectory("?sortBy=currentSalary");

    expect(await screen.findByRole("note")).toHaveTextContent(/different currencies/i);
  });

  it("drops the warning once a currency is chosen", async () => {
    renderDirectory("?sortBy=currentSalary&currency=EUR");
    await screen.findByRole("link", { name: "Ada Lovelace" });

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("does not show the warning when not sorting by salary", async () => {
    renderDirectory();
    await screen.findByRole("link", { name: "Ada Lovelace" });

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("EmployeeDirectory: pagination", () => {
  it("shows the page position and moves to the next page", async () => {
    const user = userEvent.setup();
    const api = mockEmployeeApi({
      list: (url) =>
        listDto([ada], { total: 60, totalPages: 3, page: Number(url.searchParams.get("page") ?? 1) }),
    });
    renderDirectory();

    expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next page" }));

    expect(navigationLog.pushes.at(-1)).toBe("/employees?page=2");
    expect(await screen.findByText("Page 2 of 3")).toBeInTheDocument();
    expect(api.lastListCall().searchParams.get("page")).toBe("2");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
  });

  it("disables Next on the last page", async () => {
    mockEmployeeApi({ list: () => listDto([ada], { total: 60, totalPages: 3, page: 3 }) });

    renderDirectory("?page=3");

    expect(await screen.findByText("Page 3 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("falls back to a valid page for a bad page number in the URL", async () => {
    const api = mockEmployeeApi({ list: () => listDto([ada]) });

    renderDirectory("?page=banana");

    await screen.findByRole("link", { name: "Ada Lovelace" });
    expect(api.lastListCall().searchParams.has("page")).toBe(false);
  });
});

describe("EmployeeDirectory: accessibility", () => {
  it("gives the table a name and labelled column headers", async () => {
    mockEmployeeApi({ list: () => listDto([ada]) });

    renderDirectory();

    expect(await screen.findByRole("table", { name: "Employees" })).toBeInTheDocument();
    for (const name of ["Name", "Country", "Department", "Job title", "Hired", "Salary", "Status", "Actions"]) {
      expect(screen.getByRole("columnheader", { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
  });

  it("announces result counts politely", async () => {
    mockEmployeeApi({ list: () => listDto([ada]) });

    renderDirectory();

    const summary = await screen.findByText("Showing 1–1 of 1 employee");
    expect(summary).toHaveAttribute("aria-live", "polite");
  });
});
