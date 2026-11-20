// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { EmailAlreadyExistsError, EmployeeNotFoundError } from "@/server/employees/errors";
import { InvalidJsonError, parseBody, toErrorResponse } from "./api-errors";

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

describe("toErrorResponse", () => {
  it("maps validation errors to 400 with per-field messages", async () => {
    const result = z.object({ email: z.email(), age: z.number() }).safeParse({ email: "x", age: "y" });
    if (result.success) throw new Error("expected validation to fail");

    const response = toErrorResponse(result.error);

    expect(response.status).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: {
        code: "validation_failed",
        fields: { email: [expect.any(String)], age: [expect.any(String)] },
      },
    });
  });

  it("maps invalid JSON to 400", async () => {
    const response = toErrorResponse(new InvalidJsonError());

    expect(response.status).toBe(400);
    expect(await readJson(response)).toMatchObject({ error: { code: "invalid_json" } });
  });

  it("maps a missing employee to 404", async () => {
    const response = toErrorResponse(new EmployeeNotFoundError("abc"));

    expect(response.status).toBe(404);
    expect(await readJson(response)).toMatchObject({ error: { code: "not_found" } });
  });

  it("maps a duplicate email to 409 and points at the email field", async () => {
    const response = toErrorResponse(new EmailAlreadyExistsError("ada@example.com"));

    expect(response.status).toBe(409);
    expect(await readJson(response)).toMatchObject({
      error: { code: "email_already_exists", fields: { email: [expect.any(String)] } },
    });
  });

  it("hides the details of unexpected errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = toErrorResponse(new Error("connection string postgres://secret"));

    expect(response.status).toBe(500);
    const body = JSON.stringify(await readJson(response));
    expect(body).toContain("internal_error");
    expect(body).not.toContain("secret");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("parseBody", () => {
  const schema = z.object({ name: z.string() });

  it("returns the validated body", async () => {
    const request = new Request("http://localhost/x", {
      method: "POST",
      body: JSON.stringify({ name: "Ada" }),
    });

    expect(await parseBody(request, schema)).toEqual({ name: "Ada" });
  });

  it("throws InvalidJsonError for a body that is not JSON", async () => {
    const request = new Request("http://localhost/x", { method: "POST", body: "{nope" });

    await expect(parseBody(request, schema)).rejects.toBeInstanceOf(InvalidJsonError);
  });

  it("throws a validation error for the wrong shape", async () => {
    const request = new Request("http://localhost/x", {
      method: "POST",
      body: JSON.stringify({ name: 5 }),
    });

    await expect(parseBody(request, schema)).rejects.toBeInstanceOf(z.ZodError);
  });
});
