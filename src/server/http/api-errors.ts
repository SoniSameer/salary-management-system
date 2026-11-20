import { z } from "zod";
import {
  ConcurrentSalaryChangeError,
  EmailAlreadyExistsError,
  EmployeeInactiveError,
  EmployeeNotFoundError,
  SalaryUnchangedError,
} from "@/server/employees/errors";

export class InvalidJsonError extends Error {
  constructor() {
    super("Request body must be valid JSON");
    this.name = "InvalidJsonError";
  }
}

/** Reads a JSON body and validates it. Throws InvalidJsonError or ZodError. */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new InvalidJsonError();
  }
  return schema.parse(json);
}

interface ErrorBody {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

function errorResponse(status: number, body: ErrorBody["error"]): Response {
  return Response.json({ error: body } satisfies ErrorBody, { status });
}

/**
 * Turns an error from the service layer into an HTTP response. Route handlers
 * call this in their catch block, so the status mapping lives in one place.
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) {
    const { fieldErrors, formErrors } = z.flattenError(error);
    return errorResponse(400, {
      code: "validation_failed",
      message: formErrors[0] ?? "Some fields are invalid",
      fields: fieldErrors as Record<string, string[]>,
    });
  }
  if (error instanceof InvalidJsonError) {
    return errorResponse(400, { code: "invalid_json", message: error.message });
  }
  if (error instanceof EmployeeNotFoundError) {
    return errorResponse(404, { code: "not_found", message: "Employee not found" });
  }
  if (error instanceof EmailAlreadyExistsError) {
    return errorResponse(409, {
      code: "email_already_exists",
      message: "An employee with this email already exists",
      fields: { email: ["This email is already in use"] },
    });
  }

  if (error instanceof EmployeeInactiveError) {
    return errorResponse(409, {
      code: "employee_inactive",
      message: "This employee is deactivated, so their salary cannot be changed",
    });
  }
  if (error instanceof SalaryUnchangedError) {
    return errorResponse(409, {
      code: "salary_unchanged",
      message: "The new salary is the same as the current salary",
      fields: { salary: ["Enter a different amount"] },
    });
  }
  if (error instanceof ConcurrentSalaryChangeError) {
    return errorResponse(409, {
      code: "salary_changed_concurrently",
      message: "This employee was changed by someone else. Reload and try again",
    });
  }

  // Unexpected: log the details on the server, never send them to the client.
  console.error("Unhandled API error", error);
  return errorResponse(500, { code: "internal_error", message: "Something went wrong" });
}
