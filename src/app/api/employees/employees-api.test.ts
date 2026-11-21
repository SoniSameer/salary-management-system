// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmployeeService } from "@/server/employees/employee-service";
import { SalaryService } from "@/server/employees/salary-service";
import { InMemoryEmployeeRepository } from "@/test/fakes/in-memory-employee-repository";
import { POST as deactivate } from "./[id]/deactivate/route";
import { GET as details, PATCH as update } from "./[id]/route";
import { POST as changeSalary } from "./[id]/salary/route";
import { GET as filterOptions } from "./filter-options/route";
import { GET as list, POST as create } from "./route";

let service: EmployeeService;
let salaryService: SalaryService;

// connection() only works inside a real Next.js request. The handlers are called directly here,
// and the order "wait for a request, then query" is covered in request-time-routes.test.ts.
vi.mock("next/server", () => ({ connection: async () => {} }));

// The handlers get their services from the container. Swap in ones that use
// the in-memory repository so these tests need no database.
vi.mock("@/server/container", () => ({
  getEmployeeService: () => service,
  getSalaryService: () => salaryService,
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
    const repository = new InMemoryEmployeeRepository();
    const now = () => new Date("2026-05-20T09:30:00.000Z");
    service = new EmployeeService(repository, now);
    salaryService = new SalaryService(repository, now);
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

  describe("GET /api/employees", () => {
    const listRequest = (query: string) => new Request(`http://localhost/api/employees${query}`);

    async function createNamed(fullName: string, email: string, country = "Germany") {
      await create(jsonRequest("POST", { ...validBody, fullName, email, country }));
    }

    it("returns a page with totals", async () => {
      await createNamed("Ada Lovelace", "ada@example.com");
      await createNamed("Grace Hopper", "grace@example.com");
      await createNamed("Linus T", "linus@example.com");

      const response = await list(listRequest("?pageSize=2&page=2"));

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        items: [{ fullName: "Linus T" }],
        total: 3,
        totalPages: 2,
        page: 2,
        pageSize: 2,
      });
    });

    it("applies filters and search from the query string", async () => {
      await createNamed("Ada Lovelace", "ada@example.com", "Germany");
      await createNamed("Grace Hopper", "grace@example.com", "France");

      const byCountry = await (await list(listRequest("?country=France"))).json();
      const bySearch = await (await list(listRequest("?search=ADA"))).json();

      expect(byCountry).toMatchObject({ total: 1, items: [{ fullName: "Grace Hopper" }] });
      expect(bySearch).toMatchObject({ total: 1, items: [{ fullName: "Ada Lovelace" }] });
    });

    it("treats empty filter parameters as not set", async () => {
      await createNamed("Ada Lovelace", "ada@example.com");

      const response = await list(listRequest("?country=&currency=&search="));

      expect(await response.json()).toMatchObject({ total: 1 });
    });

    it.each([
      ["a page size over the cap", "?pageSize=1000"],
      ["page zero", "?page=0"],
      ["an unknown sort field", "?sortBy=password"],
      ["an unknown status", "?status=deleted"],
    ])("returns 400 for %s", async (_label, query) => {
      const response = await list(listRequest(query));

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: "validation_failed" } });
    });
  });

  describe("GET /api/employees/filter-options", () => {
    it("returns the distinct values for the filters", async () => {
      await create(jsonRequest("POST", validBody));

      const response = await filterOptions();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        countries: ["Germany"],
        departments: ["Engineering"],
        jobTitles: ["Software Engineer"],
        currencies: ["EUR"],
      });
    });
  });

  describe("GET /api/employees/[id]", () => {
    it("returns the employee with salary history", async () => {
      const { id } = await createEmployee();

      const response = await details(new Request("http://localhost"), idContext(id));

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        employee: { id, currentSalary: 70000 },
        salaryHistory: [{ amount: 70000, currency: "EUR", reason: "Starting salary" }],
      });
    });

    it("returns 404 for an unknown employee", async () => {
      const response = await details(new Request("http://localhost"), idContext(UNKNOWN_ID));

      expect(response.status).toBe(404);
    });

    it("returns 400 for a malformed id", async () => {
      const response = await details(new Request("http://localhost"), idContext("abc"));

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/employees/[id]/salary", () => {
    const salaryContext = (id: string) =>
      ({ params: Promise.resolve({ id }) }) as RouteContext<"/api/employees/[id]/salary">;

    it("changes the salary, returns 201 and extends the history", async () => {
      const { id } = await createEmployee();

      const response = await changeSalary(
        jsonRequest("POST", { salary: 78000, reason: "Promotion" }),
        salaryContext(id),
      );

      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({
        employee: { id, currentSalary: 78000 },
        record: { amount: 78000, currency: "EUR", reason: "Promotion" },
      });
      const after = await (await details(new Request("http://localhost"), idContext(id))).json();
      expect(after).toMatchObject({
        salaryHistory: [{ amount: 78000 }, { amount: 70000 }],
      });
    });

    it("returns 400 for an invalid amount", async () => {
      const { id } = await createEmployee();

      const response = await changeSalary(jsonRequest("POST", { salary: 0 }), salaryContext(id));

      expect(response.status).toBe(400);
    });

    it("returns 400 if the caller tries to set the currency", async () => {
      const { id } = await createEmployee();

      const response = await changeSalary(
        jsonRequest("POST", { salary: 80000, currency: "USD" }),
        salaryContext(id),
      );

      expect(response.status).toBe(400);
    });

    it("returns 409 when the salary is unchanged", async () => {
      const { id } = await createEmployee();

      const response = await changeSalary(jsonRequest("POST", { salary: 70000 }), salaryContext(id));

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: { code: "salary_unchanged" } });
    });

    it("returns 409 for a deactivated employee", async () => {
      const { id } = await createEmployee();
      await deactivate(new Request("http://localhost", { method: "POST" }), deactivateContext(id));

      const response = await changeSalary(jsonRequest("POST", { salary: 90000 }), salaryContext(id));

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: { code: "employee_inactive" } });
    });

    it("returns 404 for an unknown employee", async () => {
      const response = await changeSalary(
        jsonRequest("POST", { salary: 90000 }),
        salaryContext(UNKNOWN_ID),
      );

      expect(response.status).toBe(404);
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
