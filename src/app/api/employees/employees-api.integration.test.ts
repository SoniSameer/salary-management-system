// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EmployeeService } from "@/server/employees/employee-service";
import { PrismaEmployeeRepository } from "@/server/employees/prisma-employee-repository";
import { createTestPrisma, resetDatabase } from "@/test/integration-db";
import { POST as deactivate } from "./[id]/deactivate/route";
import { PATCH as update } from "./[id]/route";
import { POST as create } from "./route";

const prisma = createTestPrisma();

// Real handlers, real Prisma repository, real PostgreSQL: only the container
// is replaced so the service points at the test database.
vi.mock("@/server/container", () => ({
  getEmployeeService: () => new EmployeeService(new PrismaEmployeeRepository(prisma)),
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
