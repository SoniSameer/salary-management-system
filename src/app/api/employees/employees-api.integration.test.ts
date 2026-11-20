// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EmployeeService } from "@/server/employees/employee-service";
import { PrismaEmployeeRepository } from "@/server/employees/prisma-employee-repository";
import { createTestPrisma, resetDatabase } from "@/test/integration-db";
import { SalaryService } from "@/server/employees/salary-service";
import { POST as deactivate } from "./[id]/deactivate/route";
import { GET as details, PATCH as update } from "./[id]/route";
import { POST as changeSalary } from "./[id]/salary/route";
import { POST as create } from "./route";

const prisma = createTestPrisma();

// Real handlers, real Prisma repository, real PostgreSQL: only the container
// is replaced so the services point at the test database.
vi.mock("@/server/container", () => ({
  getEmployeeService: () => new EmployeeService(new PrismaEmployeeRepository(prisma)),
  getSalaryService: () => new SalaryService(new PrismaEmployeeRepository(prisma)),
}));

const body = {
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  country: "Germany",
  department: "Engineering",
  jobTitle: "Software Engineer",
  currency: "EUR",
  salary: 70000,
  hiredAt: "2024-01-15",
};

function request(method: string, payload: unknown): Request {
  return new Request("http://localhost/api/employees", {
    method,
    body: JSON.stringify(payload),
  });
}

describe("employees API with PostgreSQL", () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates an employee together with the first salary record", async () => {
    const response = await create(request("POST", body));
    const created = (await response.json()) as { id: string };

    expect(response.status).toBe(201);
    const records = await prisma.salaryRecord.findMany({ where: { employeeId: created.id } });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ amount: 70000, currency: "EUR", reason: "Starting salary" });
  });

  it("returns 409 for a duplicate email and creates nothing extra", async () => {
    await create(request("POST", body));

    const response = await create(request("POST", body));

    expect(response.status).toBe(409);
    expect(await prisma.employee.count()).toBe(1);
  });

  describe("salary changes", () => {
    const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

    async function createEmployee(): Promise<string> {
      const created = (await (await create(request("POST", body))).json()) as { id: string };
      return created.id;
    }

    it("updates the salary and adds a history record in the employee's currency", async () => {
      const id = await createEmployee();

      const response = await changeSalary(
        request("POST", { salary: 78000, reason: "Promotion" }),
        ctx(id) as RouteContext<"/api/employees/[id]/salary">,
      );

      expect(response.status).toBe(201);
      const employee = await prisma.employee.findUniqueOrThrow({ where: { id } });
      expect(employee.currentSalary).toBe(78000);
      const records = await prisma.salaryRecord.findMany({
        where: { employeeId: id },
        orderBy: { effectiveAt: "asc" },
      });
      expect(records.map((r) => [r.amount, r.currency, r.reason])).toEqual([
        [70000, "EUR", "Starting salary"],
        [78000, "EUR", "Promotion"],
      ]);
    });

    it("shows the new history through the details endpoint", async () => {
      const id = await createEmployee();
      await changeSalary(
        request("POST", { salary: 78000 }),
        ctx(id) as RouteContext<"/api/employees/[id]/salary">,
      );

      const response = await details(
        new Request("http://localhost"),
        ctx(id) as RouteContext<"/api/employees/[id]">,
      );
      const result = (await response.json()) as { salaryHistory: { amount: number }[] };

      expect(result.salaryHistory.map((r) => r.amount)).toEqual([78000, 70000]);
    });

    it("rejects an unchanged salary without writing history", async () => {
      const id = await createEmployee();

      const response = await changeSalary(
        request("POST", { salary: 70000 }),
        ctx(id) as RouteContext<"/api/employees/[id]/salary">,
      );

      expect(response.status).toBe(409);
      expect(await prisma.salaryRecord.count()).toBe(1);
    });

    it("rejects a change for a deactivated employee without writing anything", async () => {
      const id = await createEmployee();
      await deactivate(
        request("POST", {}),
        ctx(id) as RouteContext<"/api/employees/[id]/deactivate">,
      );

      const response = await changeSalary(
        request("POST", { salary: 90000 }),
        ctx(id) as RouteContext<"/api/employees/[id]/salary">,
      );

      expect(response.status).toBe(409);
      expect((await prisma.employee.findUniqueOrThrow({ where: { id } })).currentSalary).toBe(70000);
      expect(await prisma.salaryRecord.count()).toBe(1);
    });
  });

  it("updates then deactivates, keeping the employee and history", async () => {
    const created = (await (await create(request("POST", body))).json()) as { id: string };
    const ctx = { params: Promise.resolve({ id: created.id }) };

    const updated = await update(
      request("PATCH", { jobTitle: "Staff Engineer" }),
      ctx as RouteContext<"/api/employees/[id]">,
    );
    const deactivated = await deactivate(
      request("POST", {}),
      ctx as RouteContext<"/api/employees/[id]/deactivate">,
    );

    expect(updated.status).toBe(200);
    expect(deactivated.status).toBe(200);
    expect(await deactivated.json()).toMatchObject({ isActive: false, jobTitle: "Staff Engineer" });
    expect(await prisma.employee.count()).toBe(1);
    expect(await prisma.salaryRecord.count()).toBe(1);
  });
});
