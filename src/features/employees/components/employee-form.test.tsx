import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { employeeDto, listDto, mockEmployeeApi } from "@/test/mock-api";
import { ApiRequestError, type EmployeePatchPayload, type NewEmployeePayload } from "../api-client";
import { EmployeeForm } from "./employee-form";

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

async function fillCreateForm(user: ReturnType<typeof userEvent.setup>, overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    "Full name": "Ada Lovelace",
    Email: "ada@example.com",
    Country: "Germany",
    Department: "Engineering",
    "Job title": "Software Engineer",
    Currency: "EUR",
    "Starting salary (per year)": "70000",
    "Hire date": "2024-01-15",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    const field = screen.getByLabelText(label);
    await user.clear(field);
    if (value) await user.type(field, value);
  }
}

describe("EmployeeForm (create)", () => {
  function renderCreate(onSubmit = vi.fn().mockResolvedValue(undefined)) {
    mockEmployeeApi({ list: () => listDto([]) });
    render(<EmployeeForm mode="create" onSubmit={onSubmit} />);
    return onSubmit;
  }

  it("has a labelled field for everything a new employee needs", () => {
    renderCreate();

    for (const label of [
      "Full name",
      "Email",
      "Country",
      "Department",
      "Job title",
      "Currency",
      "Starting salary (per year)",
      "Hire date",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Add employee" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/employees");
  });

  it("explains every problem and does not submit an empty form", async () => {
    const user = userEvent.setup();
    const onSubmit = renderCreate();

    await user.click(screen.getByRole("button", { name: "Add employee" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter a salary")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid date")).toBeInTheDocument();
    expect(screen.getAllByText("This field is required")).toHaveLength(4);
  });

  it("moves focus to the first invalid field and marks it for screen readers", async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole("button", { name: "Add employee" }));

    const name = screen.getByLabelText("Full name");
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute("aria-invalid", "true");
    const describedBy = name.getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)).toHaveTextContent("This field is required");
    expect(screen.getByLabelText("Country")).toHaveAttribute("aria-invalid", "true");
  });

  it("clears a field's message as soon as the user edits it", async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.click(screen.getByRole("button", { name: "Add employee" }));
    expect(screen.getByLabelText("Full name")).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText("Full name"), "A");

    expect(screen.getByLabelText("Full name")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("submits the trimmed values as a payload", async () => {
    const user = userEvent.setup();
    const onSubmit = renderCreate();

    await fillCreateForm(user, { "Full name": "  Ada Lovelace  ", "Starting salary (per year)": "70,000" });
    await user.click(screen.getByRole("button", { name: "Add employee" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      country: "Germany",
      department: "Engineering",
      jobTitle: "Software Engineer",
      currency: "EUR",
      salary: 70000,
      hiredAt: "2024-01-15",
    } satisfies NewEmployeePayload);
  });

  it("shows a duplicate email under the email field and keeps what was typed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiRequestError("An employee with this email already exists", 409, "email_already_exists", {
        email: ["This email is already in use"],
      }),
    );
    renderCreate(onSubmit);
    await fillCreateForm(user);

    await user.click(screen.getByRole("button", { name: "Add employee" }));

    expect(await screen.findByText("This email is already in use")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText("Full name")).toHaveValue("Ada Lovelace");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a general error when the server fails, and keeps what was typed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new ApiRequestError("Something went wrong", 500, "internal_error"));
    renderCreate(onSubmit);
    await fillCreateForm(user);

    await user.click(screen.getByRole("button", { name: "Add employee" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByLabelText("Full name")).toHaveValue("Ada Lovelace");
    expect(screen.getByRole("button", { name: "Add employee" })).toBeEnabled();
  });

  it("handles an unexpected error without crashing", async () => {
    const user = userEvent.setup();
    renderCreate(vi.fn().mockRejectedValue(new Error("boom")));
    await fillCreateForm(user);

    await user.click(screen.getByRole("button", { name: "Add employee" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });

  it("blocks a double submit while saving", async () => {
    const user = userEvent.setup();
    const gate = deferred<void>();
    const onSubmit = renderCreate(vi.fn().mockReturnValue(gate.promise));
    await fillCreateForm(user);

    await user.click(screen.getByRole("button", { name: "Add employee" }));
    const saving = screen.getByRole("button", { name: "Saving…" });
    expect(saving).toBeDisabled();
    await user.click(saving);
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    gate.resolve();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add employee" })).toBeEnabled());
  });

  it("suggests existing countries, departments, job titles and currencies", async () => {
    renderCreate();

    await waitFor(() => {
      const options = document.querySelectorAll("datalist#country-options option");
      expect(Array.from(options).map((option) => option.getAttribute("value"))).toContain("Germany");
    });
    expect(document.querySelectorAll("datalist#currency-options option").length).toBeGreaterThan(0);
  });

  it("still works when the suggestions cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EmployeeForm mode="create" onSubmit={onSubmit} />);

    await fillCreateForm(user);
    await user.click(screen.getByRole("button", { name: "Add employee" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("EmployeeForm (edit)", () => {
  const employee = employeeDto();

  function renderEdit(onSubmit = vi.fn().mockResolvedValue(undefined)) {
    mockEmployeeApi({ list: () => listDto([]) });
    const view = render(<EmployeeForm mode="edit" employee={employee} onSubmit={onSubmit} />);
    return { onSubmit, ...view };
  }

  it("is filled with the employee's details", () => {
    renderEdit();

    expect(screen.getByLabelText("Full name")).toHaveValue("Ada Lovelace");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText("Country")).toHaveValue("Germany");
    expect(screen.getByLabelText("Hire date")).toHaveValue("2024-01-15");
  });

  it("shows salary and currency as read-only, with the reason", () => {
    renderEdit();

    expect(screen.queryByLabelText(/salary/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Currency")).not.toBeInTheDocument();
    expect(screen.getByText("€70,000")).toBeInTheDocument();
    expect(screen.getByText(/changed with a salary change/i)).toBeInTheDocument();
  });

  it("keeps Save disabled until something changes", async () => {
    const user = userEvent.setup();
    renderEdit();
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText("Job title"), " II");
    expect(save).toBeEnabled();

    await user.clear(screen.getByLabelText("Job title"));
    await user.type(screen.getByLabelText("Job title"), "Software Engineer");
    expect(save).toBeDisabled();
  });

  it("sends only the fields that changed", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEdit();

    await user.clear(screen.getByLabelText("Job title"));
    await user.type(screen.getByLabelText("Job title"), "Staff Engineer");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith({ jobTitle: "Staff Engineer" } satisfies EmployeePatchPayload);
  });

  it("refuses to save an invalid edit and says why", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEdit();

    await user.clear(screen.getByLabelText("Full name"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("This field is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveFocus();
  });

  it("confirms a successful save", async () => {
    const user = userEvent.setup();
    renderEdit();

    await user.type(screen.getByLabelText("Job title"), " II");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Changes saved");
  });

  it("removes the confirmation once the user edits again", async () => {
    const user = userEvent.setup();
    renderEdit();
    await user.type(screen.getByLabelText("Job title"), " II");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("status");

    await user.type(screen.getByLabelText("Job title"), "I");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a duplicate email under the email field", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiRequestError("An employee with this email already exists", 409, "email_already_exists", {
        email: ["This email is already in use"],
      }),
    );
    renderEdit(onSubmit);

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "grace@example.com");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("This email is already in use")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveFocus();
  });
});
