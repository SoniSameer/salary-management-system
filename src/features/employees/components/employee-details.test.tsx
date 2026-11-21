import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError, employeeDto, jsonResponse, mockEmployeeApi } from "@/test/mock-api";
import type { EmployeeDetailsDto, SalaryRecordDto } from "../api-client";
import { EmployeeDetails } from "./employee-details";

afterEach(() => {
  vi.unstubAllGlobals();
});

const ada = employeeDto({ currentSalary: 70000, hiredAt: "2024-01-15T00:00:00.000Z" });

const HISTORY: SalaryRecordDto[] = [
  { id: "r2", employeeId: ada.id, amount: 70000, currency: "EUR", effectiveAt: "2025-06-01T00:00:00.000Z", reason: "Annual review" },
  { id: "r1", employeeId: ada.id, amount: 62000, currency: "EUR", effectiveAt: "2024-01-15T00:00:00.000Z", reason: "Starting salary" },
];

function serve(details: EmployeeDetailsDto = { employee: ada, salaryHistory: HISTORY }) {
  return mockEmployeeApi({
    custom: (request) => {
      if (request.method === "GET" && request.path === `/api/employees/${ada.id}`) return jsonResponse(details);
      if (request.method === "POST" && request.path === `/api/employees/${ada.id}/salary`) {
        const { salary, reason } = request.body as { salary: number; reason?: string };
        return jsonResponse(
          {
            employee: { ...ada, currentSalary: salary },
            record: {
              id: "r3",
              employeeId: ada.id,
              amount: salary,
              currency: "EUR",
              effectiveAt: "2026-05-20T09:30:00.000Z",
              reason: reason ?? null,
            },
          },
          201,
        );
      }
      return undefined;
    },
  });
}

describe("EmployeeDetails: loading and failure", () => {
  it("shows a loading state, then the employee", async () => {
    serve();

    render(<EmployeeDetails employeeId={ada.id} />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading employee/i);
    expect(await screen.findByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
  });

  it("says so when the employee does not exist", async () => {
    mockEmployeeApi({ custom: () => apiError(404, "not_found", "Employee not found") });

    render(<EmployeeDetails employeeId={ada.id} />);

    expect(await screen.findByText("Employee not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to employees" })).toHaveAttribute("href", "/employees");
  });

  it("shows other failures and lets the user retry", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    mockEmployeeApi({
      custom: () => {
        attempts += 1;
        return attempts === 1
          ? apiError(500, "internal_error", "Something went wrong")
          : jsonResponse({ employee: ada, salaryHistory: HISTORY });
      },
    });

    render(<EmployeeDetails employeeId={ada.id} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
  });
});

describe("EmployeeDetails: profile", () => {
  it("shows who the employee is", async () => {
    serve();

    render(<EmployeeDetails employeeId={ada.id} />);

    await screen.findByRole("heading", { name: "Ada Lovelace" });
    expect(screen.getByText("Active")).toBeInTheDocument();
    const profile = screen.getByRole("region", { name: "Profile" });
    for (const text of ["ada@example.com", "Germany", "Engineering", "Software Engineer", "Jan 15, 2024"]) {
      expect(within(profile).getByText(text)).toBeInTheDocument();
    }
  });

  it("shows the current salary in the employee's own currency", async () => {
    serve();

    render(<EmployeeDetails employeeId={ada.id} />);

    const region = await screen.findByRole("region", { name: "Current salary" });
    expect(within(region).getByText("€70,000")).toBeInTheDocument();
    expect(within(region).getByText("EUR")).toBeInTheDocument();
  });

  it("links to the edit page and back to the directory", async () => {
    serve();

    render(<EmployeeDetails employeeId={ada.id} />);

    expect(await screen.findByRole("link", { name: "Edit profile" })).toHaveAttribute(
      "href",
      `/employees/${ada.id}/edit`,
    );
    expect(screen.getByRole("link", { name: "Back to employees" })).toHaveAttribute("href", "/employees");
  });
});

describe("EmployeeDetails: salary history", () => {
  it("lists every change, newest first, with what changed and why", async () => {
    serve();

    render(<EmployeeDetails employeeId={ada.id} />);

    const table = await screen.findByRole("table", { name: "Salary history" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Jun 1, 2025")).toBeInTheDocument();
    expect(within(rows[0]).getByText("€70,000")).toBeInTheDocument();
    expect(within(rows[0]).getByText("+€8,000 (+12.9%)")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Annual review")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Jan 15, 2024")).toBeInTheDocument();
    expect(within(rows[1]).getByText("€62,000")).toBeInTheDocument();
    expect(within(rows[1]).getByText("–")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Starting salary")).toBeInTheDocument();
  });

  it("labels the columns", async () => {
    serve();

    render(<EmployeeDetails employeeId={ada.id} />);

    await screen.findByRole("table", { name: "Salary history" });
    for (const name of ["Effective", "Salary", "Change", "Reason"]) {
      expect(screen.getByRole("columnheader", { name })).toBeInTheDocument();
    }
  });

  it("shows a dash for a record without a reason", async () => {
    serve({ employee: ada, salaryHistory: [{ ...HISTORY[1], reason: null }] });

    render(<EmployeeDetails employeeId={ada.id} />);

    const table = await screen.findByRole("table", { name: "Salary history" });
    expect(within(table).getAllByText("–")).toHaveLength(2);
  });
});

describe("EmployeeDetails: changing the salary", () => {
  it("updates the page in place: new salary, new history row, no reload", async () => {
    const user = userEvent.setup();
    const api = serve();
    render(<EmployeeDetails employeeId={ada.id} />);
    await screen.findByRole("heading", { name: "Ada Lovelace" });

    await user.click(screen.getByRole("button", { name: "Change salary" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("New salary per year (EUR)"), "78000");
    await user.type(within(dialog).getByLabelText("Reason (optional)"), "Promotion");
    await user.click(within(dialog).getByRole("button", { name: "Save salary" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const region = screen.getByRole("region", { name: "Current salary" });
    expect(within(region).getByText("€78,000")).toBeInTheDocument();
    const rows = within(screen.getByRole("table", { name: "Salary history" })).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("€78,000")).toBeInTheDocument();
    expect(within(rows[0]).getByText("+€8,000 (+11.4%)")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Promotion")).toBeInTheDocument();
    // The older rows are untouched, and the details were loaded only once.
    expect(within(rows[1]).getByText("€70,000")).toBeInTheDocument();
    expect(api.fetchMock.mock.calls.filter(([url, init]) => !init?.method && String(url).endsWith(ada.id))).toHaveLength(1);
  });

  it("can change the salary twice in a row", async () => {
    const user = userEvent.setup();
    serve();
    render(<EmployeeDetails employeeId={ada.id} />);
    await screen.findByRole("heading", { name: "Ada Lovelace" });

    for (const amount of ["78000", "85000"]) {
      await user.click(screen.getByRole("button", { name: "Change salary" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(within(dialog).getByLabelText("New salary per year (EUR)"), amount);
      await user.click(within(dialog).getByRole("button", { name: "Save salary" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    }

    const rows = within(screen.getByRole("table", { name: "Salary history" })).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText("€85,000")).toBeInTheDocument();
  });
});

describe("EmployeeDetails: a deactivated employee", () => {
  const inactive = { ...ada, isActive: false, deactivatedAt: "2025-09-30T00:00:00.000Z" };

  it("explains the status and offers no way to change the salary", async () => {
    serve({ employee: inactive, salaryHistory: HISTORY });

    render(<EmployeeDetails employeeId={ada.id} />);

    expect(await screen.findByText(/deactivated on Sep 30, 2025/i)).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change salary" })).not.toBeInTheDocument();
  });

  it("still shows the salary history", async () => {
    serve({ employee: inactive, salaryHistory: HISTORY });

    render(<EmployeeDetails employeeId={ada.id} />);

    const table = await screen.findByRole("table", { name: "Salary history" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });
});
