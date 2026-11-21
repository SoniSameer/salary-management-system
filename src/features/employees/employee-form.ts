import { z } from "zod";
import { createEmployeeSchema, updateEmployeeSchema } from "@/server/employees/employee-schemas";
import {
  ApiRequestError,
  type EmployeeDto,
  type EmployeePatchPayload,
  type NewEmployeePayload,
} from "./api-client";

/**
 * Pure logic behind the employee form: turning what the user typed into a
 * validated request, working out what changed, and placing server errors on
 * the right field. It reuses the server's Zod schemas, so the form and the API
 * can never disagree about what is valid.
 */

export const FORM_FIELDS = [
  "fullName",
  "email",
  "country",
  "department",
  "jobTitle",
  "currency",
  "salary",
  "hiredAt",
] as const;

export type FormField = (typeof FORM_FIELDS)[number];
/** Every value is text, exactly as typed. */
export type EmployeeFormValues = Record<FormField, string>;
export type FormErrors = Partial<Record<FormField, string>>;

export function emptyFormValues(): EmployeeFormValues {
  return {
    fullName: "",
    email: "",
    country: "",
    department: "",
    jobTitle: "",
    currency: "",
    salary: "",
    hiredAt: "",
  };
}

export function valuesFromEmployee(employee: EmployeeDto): EmployeeFormValues {
  return {
    fullName: employee.fullName,
    email: employee.email,
    country: employee.country,
    department: employee.department,
    jobTitle: employee.jobTitle,
    currency: employee.currency,
    salary: String(employee.currentSalary),
    hiredAt: employee.hiredAt.slice(0, 10),
  };
}

/**
 * Reads a salary the way people type it: "70,000" and "1 850 000" are fine.
 * Anything that is not a plain non-negative number (letters, exponents, signs)
 * is NaN, so it is reported as "Enter a salary" instead of being guessed at.
 */
export function parseSalary(text: string): number {
  const cleaned = text.replace(/[,\s]/g, "");
  return /^\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

function toErrors(error: z.ZodError): FormErrors {
  const errors: FormErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0]) as FormField;
    if (FORM_FIELDS.includes(field) && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export type CreateResult =
  | { ok: true; payload: NewEmployeePayload }
  | { ok: false; errors: FormErrors };

export function prepareCreate(values: EmployeeFormValues): CreateResult {
  const candidate = {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    country: values.country.trim(),
    department: values.department.trim(),
    jobTitle: values.jobTitle.trim(),
    currency: values.currency.trim(),
    salary: parseSalary(values.salary),
    hiredAt: values.hiredAt.trim(),
  };

  // The schema checks the rules. The payload keeps the plain trimmed text,
  // because the server normalises and validates it again.
  const result = createEmployeeSchema.safeParse(candidate);
  return result.success ? { ok: true, payload: candidate } : { ok: false, errors: toErrors(result.error) };
}

/** The fields an edit may change. Salary and currency are changed elsewhere. */
const EDITABLE = ["fullName", "email", "country", "department", "jobTitle", "hiredAt"] as const;
type EditableField = (typeof EDITABLE)[number];

function currentValue(employee: EmployeeDto, field: EditableField): string {
  const original = valuesFromEmployee(employee)[field];
  return field === "email" ? original.toLowerCase() : original;
}

function changedFields(employee: EmployeeDto, values: EmployeeFormValues): EmployeePatchPayload {
  const patch: EmployeePatchPayload = {};
  for (const field of EDITABLE) {
    const typed = values[field].trim();
    const same =
      field === "email"
        ? typed.toLowerCase() === currentValue(employee, field)
        : typed === currentValue(employee, field);
    if (!same) patch[field] = typed;
  }
  return patch;
}

export function hasChanges(employee: EmployeeDto, values: EmployeeFormValues): boolean {
  return Object.keys(changedFields(employee, values)).length > 0;
}

export type EditResult =
  | { kind: "unchanged" }
  | { kind: "invalid"; errors: FormErrors }
  | { kind: "ready"; patch: EmployeePatchPayload };

export function prepareEdit(employee: EmployeeDto, values: EmployeeFormValues): EditResult {
  const patch = changedFields(employee, values);
  if (Object.keys(patch).length === 0) return { kind: "unchanged" };

  const result = updateEmployeeSchema.safeParse(patch);
  return result.success ? { kind: "ready", patch } : { kind: "invalid", errors: toErrors(result.error) };
}

export interface ApiFormErrors {
  fieldErrors: FormErrors;
  /** Shown above the form when no field can be blamed. */
  general: string | undefined;
}

/** Places an API error on the field it names, or keeps its message as a general error. */
export function fieldErrorsFromApi(error: ApiRequestError): ApiFormErrors {
  const fieldErrors: FormErrors = {};
  for (const field of FORM_FIELDS) {
    const message = error.fields[field]?.[0];
    if (message) fieldErrors[field] = message;
  }
  const blamedAField = Object.keys(fieldErrors).length > 0;
  return { fieldErrors, general: blamedAField ? undefined : error.message };
}
