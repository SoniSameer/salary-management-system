import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError, employeeDto, jsonResponse, mockEmployeeApi } from "@/test/mock-api";
import { navigationLog, setUrl } from "@/test/mock-navigation";
import { CreateEmployee } from "./create-employee";
import { EditEmployee } from "./edit-employee";

vi.mock("next/navigation", async () => (await import("@/test/mock-navigation")).navigationModule);

afterEach(() => {
  vi.unstubAllGlobals();
});

const ada = employeeDto();
const DETAILS = { employee: ada, salaryHistory: [] };

async function fillCreateForm(user: ReturnType<typeof userEvent.setup>) {
  const values: Record<string, string> = {
    "Full name": "Ada Lovelace",
    Email: "ada@example.com",
    Country: "Germany",
    Department: "Engineering",
    "Job title": "Software Engineer",
    Currency: "EUR",
    "Starting salary (per year)": "70000",
    "Hire date": "2024-01-15",
  };
  for (const [label, value] of Object.entries(values)) {
    await user.type(screen.getByLabelText(label), value);
  }
}

describe("CreateEmployee", () => {
  it("creates the employee and shows them in the directory", async () => {
    const user = userEvent.setup();
    setUrl("");
    const api = mockEmployeeApi({
      custom: (request) =>
        request.method === "POST" && request.path === "/api/employees"
          ? jsonResponse(ada, 201)
          : undefined,
    });
    render(<CreateEmployee />);

    await fillCreateForm(user);
    await user.click(screen.getByRole("button", { name: "Add employee" }));

    await waitFor(() => expect(navigationLog.pushes.at(-1)).toBe("/employees?search=ada%40example.com"));
    expect(api.requests).toEqual([
      {
        method: "POST",
        path: "/api/employees",
        body: {
          fullName: "Ada Lovelace",
          email: "ada@example.com",
          country: "Germany",
          department: "Engineering",
          jobTitle: "Software Engineer",
          currency: "EUR",
          salary: 70000,
          hiredAt: "2024-01-15",
        },
      },
    ]);
  });

  it("stays on the form and shows a duplicate email next to the field", async () => {
    const user = userEvent.setup();
    setUrl("");
    mockEmployeeApi({
      custom: (request) =>
        request.method === "POST"
          ? apiError(409, "email_already_exists", "An employee with this email already exists")
          : undefined,
    });
    render(<CreateEmployee />);

    await fillCreateForm(user);
    await user.click(screen.getByRole("button", { name: "Add employee" }));

    expect(await screen.findByText("An employee with this email already exists")).toBeInTheDocument();
    expect(navigationLog.pushes).toHaveLength(0);
    expect(screen.getByLabelText("Full name")).toHaveValue("Ada Lovelace");
  });
});

describe("EditEmployee", () => {
  function routes(overrides: Partial<Record<string, Response>> = {}) {
    return mockEmployeeApi({
      custom: (request) => {
        const key = `${request.method} ${request.path}`;
        if (overrides[key]) return overrides[key].clone();
        if (key === `GET /api/employees/${ada.id}`) return jsonResponse(DETAILS);
        if (key === `PATCH /api/employees/${ada.id}`) {
          return jsonResponse({ ...ada, ...(request.body as object) });
        }
        if (key === `POST /api/employees/${ada.id}/deactivate`) {
          return jsonResponse({ ...ada, isActive: false, deactivatedAt: "2026-05-20T09:30:00.000Z" });
        }
        return undefined;
      },
    });
  }

  it("shows a loading state, then the employee's form", async () => {
    setUrl("");
    routes();

    render(<EditEmployee employeeId={ada.id} />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading employee/i);
    expect(await screen.findByLabelText("Full name")).toHaveValue("Ada Lovelace");
    expect(screen.getByRole("link", { name: /back to employees/i })).toHaveAttribute("href", "/employees");
  });

  it("says so when the employee does not exist", async () => {
    setUrl("");
    routes({
      [`GET /api/employees/${ada.id}`]: apiError(404, "not_found", "Employee not found"),
    });

    render(<EditEmployee employeeId={ada.id} />);

    expect(await screen.findByText("Employee not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to employees" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
  });

  it("shows other load failures with a retry", async () => {
    const user = userEvent.setup();
    setUrl("");
    let attempts = 0;
    mockEmployeeApi({
      custom: (request) => {
        if (request.method !== "GET") return undefined;
        attempts += 1;
        return attempts === 1
          ? apiError(500, "internal_error", "Something went wrong")
          : jsonResponse(DETAILS);
      },
    });

    render(<EditEmployee employeeId={ada.id} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Full name")).toHaveValue("Ada Lovelace");
  });

  it("saves only what changed, confirms it, and disables Save again", async () => {
    const user = userEvent.setup();
    setUrl("");
    const api = routes();
    render(<EditEmployee employeeId={ada.id} />);
    await screen.findByLabelText("Job title");

    await user.clear(screen.getByLabelText("Job title"));
    await user.type(screen.getByLabelText("Job title"), "Staff Engineer");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Changes saved");
    expect(api.requests.find((r) => r.method === "PATCH")).toMatchObject({
      path: `/api/employees/${ada.id}`,
      body: { jobTitle: "Staff Engineer" },
    });
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("explains a deactivated employee and offers no deactivate button", async () => {
    setUrl("");
    routes({
      [`GET /api/employees/${ada.id}`]: jsonResponse({
        employee: { ...ada, isActive: false, deactivatedAt: "2025-01-01T00:00:00.000Z" },
        salaryHistory: [],
      }),
    });

    render(<EditEmployee employeeId={ada.id} />);

    expect(await screen.findByText(/deactivated on Jan 1, 2025/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deactivate employee" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toBeEnabled();
  });
});

describe("Deactivating an employee", () => {
  function routes(deactivate: () => Response) {
    return mockEmployeeApi({
      custom: (request) => {
        if (request.method === "GET" && request.path === `/api/employees/${ada.id}`) {
          return jsonResponse(DETAILS);
        }
        if (request.path === `/api/employees/${ada.id}/deactivate`) return deactivate();
        return undefined;
      },
    });
  }

  async function openDialog(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByLabelText("Full name");
    await user.click(screen.getByRole("button", { name: "Deactivate employee" }));
    return screen.findByRole("alertdialog");
  }

  it("asks for confirmation and explains what will happen", async () => {
    const user = userEvent.setup();
    setUrl("");
    const api = routes(() => jsonResponse({ ...ada, isActive: false }));
    render(<EditEmployee employeeId={ada.id} />);

    const dialog = await openDialog(user);

    expect(within(dialog).getByText("Deactivate Ada Lovelace?")).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/salary history are kept/i);
    expect(dialog).toHaveTextContent(/cannot be undone/i);
    expect(dialog).toHaveTextContent(/no longer appear in the employee list or in salary insights/i);
    expect(api.requests.some((r) => r.path.endsWith("/deactivate"))).toBe(false);
  });

  it("does nothing when cancelled", async () => {
    const user = userEvent.setup();
    setUrl("");
    const api = routes(() => jsonResponse({ ...ada, isActive: false }));
    render(<EditEmployee employeeId={ada.id} />);
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(api.requests.some((r) => r.path.endsWith("/deactivate"))).toBe(false);
    expect(navigationLog.pushes).toHaveLength(0);
  });

  it("can be dismissed with Escape", async () => {
    const user = userEvent.setup();
    setUrl("");
    routes(() => jsonResponse({ ...ada, isActive: false }));
    render(<EditEmployee employeeId={ada.id} />);
    await openDialog(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("deactivates on confirmation and returns to the directory", async () => {
    const user = userEvent.setup();
    setUrl("");
    const api = routes(() => jsonResponse({ ...ada, isActive: false }));
    render(<EditEmployee employeeId={ada.id} />);
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));

    await waitFor(() => expect(navigationLog.pushes.at(-1)).toBe("/employees"));
    expect(api.requests.find((r) => r.path.endsWith("/deactivate"))).toMatchObject({ method: "POST" });
  });

  it("keeps the dialog open and explains a failure", async () => {
    const user = userEvent.setup();
    setUrl("");
    routes(() => apiError(500, "internal_error", "Something went wrong"));
    render(<EditEmployee employeeId={ada.id} />);
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(navigationLog.pushes).toHaveLength(0);
    expect(within(dialog).getByRole("button", { name: "Deactivate" })).toBeEnabled();
  });
});
