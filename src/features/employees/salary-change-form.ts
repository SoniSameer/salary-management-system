import { changeSalarySchema } from "@/server/employees/salary-schemas";
import type { SalaryChangePayload } from "./api-client";
import { parseSalary } from "./employee-form";

export interface SalaryChangeValues {
  /** The new salary, exactly as typed. */
  salary: string;
  reason: string;
}

export type SalaryChangeErrors = Partial<Record<keyof SalaryChangeValues, string>>;

export type SalaryChangeResult =
  | { ok: true; payload: SalaryChangePayload }
  | { ok: false; errors: SalaryChangeErrors };

/**
 * Validates a salary change before it is sent. The rules come from the same
 * schema the API uses. "Same as today" is also caught here so the user gets an
 * instant message, although the server enforces it too.
 */
export function prepareSalaryChange(currentSalary: number, values: SalaryChangeValues): SalaryChangeResult {
  const salary = parseSalary(values.salary);
  const reason = values.reason.trim();

  const result = changeSalarySchema.safeParse({ salary, reason: reason || undefined });
  if (!result.success) {
    const errors: SalaryChangeErrors = {};
    for (const issue of result.error.issues) {
      const field = String(issue.path[0]);
      if ((field === "salary" || field === "reason") && !errors[field]) errors[field] = issue.message;
    }
    return { ok: false, errors };
  }

  if (salary === currentSalary) {
    return { ok: false, errors: { salary: "Enter a different amount from the current salary" } };
  }

  return { ok: true, payload: reason ? { salary, reason } : { salary } };
}
