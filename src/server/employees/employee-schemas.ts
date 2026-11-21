import { z } from "zod";

// Fits PostgreSQL's 4-byte integer column with a wide margin.
export const MAX_SALARY = 1_000_000_000;

// Messages are shown to the HR manager in the form and in API responses.
const requiredText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "This field is required")
    .max(max, `Use ${max} characters or fewer`);

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254, "Use 254 characters or fewer"));

const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO currency code, for example USD");

export const salarySchema = z
  .number("Enter a salary")
  .int("Use a whole number")
  .positive("Enter a salary above zero")
  .max(MAX_SALARY, "That amount is too large");

// "2024-01-15" becomes midnight UTC, matching how the database stores dates.
const dateSchema = z.iso
  .date("Enter a valid date")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const profileFields = {
  fullName: requiredText(120),
  email: emailSchema,
  country: requiredText(80),
  department: requiredText(80),
  jobTitle: requiredText(120),
  hiredAt: dateSchema,
};

export const createEmployeeSchema = z.strictObject({
  ...profileFields,
  currency: currencySchema,
  /** Starting annual salary in whole currency units. */
  salary: salarySchema,
});

/**
 * Strict on purpose: salary and currency are not editable here, and a request
 * that tries to change them gets an error instead of being silently ignored.
 */
export const updateEmployeeSchema = z
  .strictObject(profileFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export const employeeIdSchema = z.uuid();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
