import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError, employeeDto, jsonResponse, mockEmployeeApi } from "@/test/mock-api";
import { ChangeSalaryDialog } from "./change-salary-dialog";

afterEach(() => {
  vi.unstubAllGlobals();
});

const ada = employeeDto();
const RECORD = {
  id: "r3",
  employeeId: ada.id,
  amount: 78000,
  currency: "EUR",
  effectiveAt: "2026-05-20T09:30:00.000Z",
  reason: "Promotion",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function setup(salaryResponse: () => Response | Promise<Response> = () => jsonResponse({ employee: { ...ada, currentSalary: 78000 }, record: RECORD }, 201)) {
  const api = mockEmployeeApi({
    custom: (request) => (request.path === `/api/employees/${ada.id}/salary` ? salaryResponse() : undefined),
  });
  const onChanged = vi.fn();
  const user = userEvent.setup();
  render(<ChangeSalaryDialog employee={ada} onChanged={onChanged} />);
  return { api, onChanged, user };
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Change salary" }));
  return screen.findByRole("dialog");
}

describe("ChangeSalaryDialog", () => {
  it("opens with the current salary and says which currency the new amount is in", async () => {
    const { user } = setup();

    const dialog = await open(user);

    expect(within(dialog).getByText("Change salary for Ada Lovelace")).toBeInTheDocument();
    expect(within(dialog).getByText("€70,000")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("New salary per year (EUR)")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Reason (optional)")).toBeInTheDocument();
  });

  it("does not offer a currency field, because the currency is fixed", async () => {
    const { user } = setup();

    const dialog = await open(user);

    expect(within(dialog).queryByLabelText(/^currency/i)).not.toBeInTheDocument();
  });

  it("explains an empty or invalid amount and does not call the server", async () => {
    const { user, api } = setup();
    const dialog = await open(user);

    await user.click(within(dialog).getByRole("button", { name: "Save salary" }));

    expect(within(dialog).getByText("Enter a salary")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("New salary per year (EUR)")).toHaveFocus();
    expect(within(dialog).getByLabelText("New salary per year (EUR)")).toHaveAttribute("aria-invalid", "true");
    expect(api.requests).toHaveLength(0);
  });

  it("asks for a different amount when the salary is unchanged", async () => {
    const { user, api } = setup();
    const dialog = await open(user);

    await user.type(within(dialog).getByLabelText("New salary per year (EUR)"), "70000");
    await user.click(within(dialog).getByRole("button", { name: "Save salary" }));

    expect(within(dialog).getByText("Enter a different amount from the current salary")).toBeInTheDocument();
    expect(api.requests).toHaveLength(0);
  });

  it("sends the new salary and reason, hands the result to the page, and closes", async () => {
    const { user, api, onChanged } = setup();
    const dialog = await open(user);

    await user.type(within(dialog).getByLabelText("New salary per year (EUR)"), "78,000");
    await user.type(within(dialog).getByLabelText("Reason (optional)"), "  Promotion ");
    await user.click(within(dialog).getByRole("button", { name: "Save salary" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(api.requests[0]).toEqual({
      method: "POST",
      path: `/api/employees/${ada.id}/salary`,
      body: { salary: 78000, reason: "Promotion" },
    });
    expect(onChanged.mock.calls[0][0]).toMatchObject({ employee: { currentSalary: 78000 }, record: { id: "r3" } });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("sends only the salary when no reason is given", async () => {
    const { user, api } = setup();
    const dialog = await open(user);

    await user.type(within(dialog).getByLabelText("New salary per year (EUR)"), "78000");
    await user.click(within(dialog).getByRole("button", { name: "Save salary" }));

    await waitFor(() => expect(api.requests).toHaveLength(1));
    expect(api.requests[0].body).toEqual({ salary: 78000 });
  });

  it("shows a message from the server next to the field it names", async () => {
    const { user, onChanged } = setup(() =>
      jsonResponse(
        {
          error: {
            code: "salary_unchanged",
            message: "The new salary is the same as the current salary",
            fields: { salary: ["Enter a different amount"] },
          },
        },
        409,
      ),
    );
    const dialog = await open(user);

    await user.type(within(dialog).getByLabelText("New salary per year (EUR)"), "78000");
    await user.click(within(dialog).getByRole("button", { name: "Save salary" }));

    expect(await within(dialog).findByText("Enter a different amount")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it.each([
    [
      "someone else changed the salary first",
      "salary_changed_concurrently",
      "This employee was changed by someone else. Reload and try again",
    ],
    [
      "the employee was deactivated",
      "employee_inactive",
      "This employee is deactivated, so their salary cannot be changed",
    ],
  ])("keeps the dialog open and explains when %s", async (_label, code, message) => {
    const { user, onChanged } = setup(() => apiError(409, code, message));
    const dialog = await open(user);

    await user.type(within(dialog).getByLabelText("New salary per year (EUR)"), "78000");
    await user.click(within(dialog).getByRole("button", { name: "Save salary" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
    expect(within(dialog).getByLabelText("New salary per year (EUR)")).toHaveValue("78000");
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("blocks a double submit while saving", async () => {
    const gate = deferred<Response>();
    const { user, api } = setup(() => gate.promise);
    const dialog = await open(user);
    await user.type(within(dialog).getByLabelText("New salary per year (EUR)"), "78000");

    await user.click(within(dialog).getByRole("button", { name: "Save salary" }));
    const saving = within(dialog).getByRole("button", { name: "Saving…" });
    expect(saving).toBeDisabled();
    await user.click(saving);
    await user.keyboard("{Enter}");

    expect(api.fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/salary"))).toHaveLength(1);
    gate.resolve(jsonResponse({ employee: { ...ada, currentSalary: 78000 }, record: RECORD }, 201));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes on Cancel and Escape without saving, and starts empty next time", async () => {
    const { user, api } = setup();
    let dialog = await open(user);
    await user.type(within(dialog).getByLabelText("New salary per year (EUR)"), "99999");

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    dialog = await open(user);
    expect(within(dialog).getByLabelText("New salary per year (EUR)")).toHaveValue("");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.requests).toHaveLength(0);
  });
});
