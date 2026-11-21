import { z } from "zod";
import { salarySchema } from "./employee-schemas";

/**
 * Body of a salary change. Currency and effective date are deliberately not
 * accepted: the currency is the employee's own, and the change takes effect now.
 */
export const MAX_REASON_LENGTH = 200;

export const changeSalarySchema = z.strictObject({
  /** New annual salary in whole currency units. */
  salary: salarySchema,
  reason: z
    .string()
    .trim()
    .max(MAX_REASON_LENGTH, `Use ${MAX_REASON_LENGTH} characters or fewer`)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

// Written out by hand: Zod infers `reason` as a required key because of the
// transform above, but callers should be free to leave it out.
export interface ChangeSalaryInput {
  salary: number;
  reason?: string;
}
