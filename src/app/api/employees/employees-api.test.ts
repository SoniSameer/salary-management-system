// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmployeeService } from "@/server/employees/employee-service";
import { InMemoryEmployeeRepository } from "@/test/fakes/in-memory-employee-repository";
import { POST as deactivate } from "./[id]/deactivate/route";
import { PATCH as update } from "./[id]/route";
import { POST as create } from "./route";

let service: EmployeeService;

// The handlers get their service from the container. Swap in one that uses the
// in-memory repository so these tests need no database.
vi.mock("@/server/container", () => ({
  getEmployeeService: () => service,
}));

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

const validBody = {
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  country: "Germany",
  department: "Engineering",
  jobTitle: "Software Engineer",
  currency: "EUR",
  salary: 70000,
  hiredAt: "2024-01-15",
};

function jsonRequest(method: string, body: unknown): Request {
  return new Request("http://localhost/api/employees", {
    method,
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const idContext = (id: string) =>
  ({ params: Promise.resolve({ id }) }) as RouteContext<"/api/employees/[id]">;
const deactivateContext = (id: string) =>
  ({ params: Promise.resolve({ id }) }) as RouteContext<"/api/employees/[id]/deactivate">;

async function createEmployee(): Promise<{ id: string }> {
  const response = await create(jsonRequest("POST", validBody));
  return (await response.json()) as { id: string };
}

describe("employees API", () => {
  beforeEach(() => {
    service = new EmployeeService(
      new InMemoryEmployeeRepository(),
      () => new Date("2026-05-20T09:30:00.000Z"),
    );
  });

  describe("POST /api/employees", () => {
    it("creates an employee and returns 201", async () => {
      const response = await create(jsonRequest("POST", validBody));

      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({
        fullName: "Ada Lovelace",
        currentSalary: 70000,
        currency: "EUR",
        isActive: true,
      });
    });

    it("returns 400 with field errors for invalid input", async () => {
      const response = await create(jsonRequest("POST", { ...validBody, email: "bad", salary: -5 }));

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: "validation_failed", fields: { email: expect.any(Array), salary: expect.any(Array) } },
      });
    });

    it("returns 400 for a body that is not JSON", async () => {
      const response = await create(jsonRequest("POST", "{broken"));

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: "invalid_json" } });
    });

    it("returns 409 for a duplicate email", async () => {
      await create(jsonRequest("POST", validBody));

      const response = await create(jsonRequest("POST", validBody));

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: { code: "email_already_exists" } });
    });
  });

  describe("PATCH /api/employees/[id]", () => {
    it("updates profile fields", async () => {
      const { id } = await createEmployee();

      const response = await update(jsonRequest("PATCH", { jobTitle: "Staff Engineer" }), idContext(id));

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ id, jobTitle: "Staff Engineer" });
    });

    it("refuses to change salary through a profile update", async () => {
      const { id } = await createEmployee();

      const response = await update(jsonRequest("PATCH", { salary: 999999 }), idContext(id));

      expect(response.status).toBe(400);
    });

    it("returns 404 for an unknown employee", async () => {
      const response = await update(jsonRequest("PATCH", { fullName: "Nobody" }), idContext(UNKNOWN_ID));

      expect(response.status).toBe(404);
    });

    it("returns 400 for a malformed id", async () => {
      const response = await update(jsonRequest("PATCH", { fullName: "X" }), idContext("123"));

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/employees/[id]/deactivate", () => {
    it("deactivates the employee", async () => {
      const { id } = await createEmployee();

      const response = await deactivate(new Request("http://localhost", { method: "POST" }), deactivateContext(id));

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        id,
        isActive: false,
        deactivatedAt: "2026-05-20T09:30:00.000Z",
      });
    });

    it("returns 404 for an unknown employee", async () => {
      const response = await deactivate(
        new Request("http://localhost", { method: "POST" }),
        deactivateContext(UNKNOWN_ID),
      );

      expect(response.status).toBe(404);
    });
  });
});
