import { describe, expect, it } from "vitest";
import type { EmployeeRepository, NewEmployee } from "./employee-repository";
import { EmailAlreadyExistsError } from "./errors";

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

export function newEmployee(overrides: Partial<NewEmployee> = {}): NewEmployee {
  return {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    country: "Germany",
    department: "Engineering",
    jobTitle: "Software Engineer",
    currency: "EUR",
    hiredAt: new Date("2024-01-15T00:00:00.000Z"),
    initialSalary: {
      amount: 70_000,
      effectiveAt: new Date("2024-01-15T00:00:00.000Z"),
      reason: "Starting salary",
    },
    ...overrides,
  };
}

/**
 * Behavior every EmployeeRepository must have. The in-memory fake runs this in
 * unit tests and the Prisma repository runs it against a real database, so the
 * fake cannot quietly drift from production behavior.
 *
 * `createRepository` must return a repository over an EMPTY store.
 */
export function describeEmployeeRepositoryContract(
  name: string,
  createRepository: () => Promise<EmployeeRepository>,
): void {
  describe(`${name} satisfies the EmployeeRepository contract`, () => {
    describe("createWithInitialSalary", () => {
      it("returns an active employee whose current salary is the starting salary", async () => {
        const repo = await createRepository();

        const employee = await repo.createWithInitialSalary(newEmployee());

        expect(employee).toMatchObject({
          fullName: "Ada Lovelace",
          email: "ada@example.com",
          country: "Germany",
          department: "Engineering",
          jobTitle: "Software Engineer",
          currency: "EUR",
          currentSalary: 70_000,
          isActive: true,
          deactivatedAt: null,
          hiredAt: new Date("2024-01-15T00:00:00.000Z"),
        });
        expect(employee.id).toMatch(/^[0-9a-f-]{36}$/);
      });

      it("writes the first salary history record", async () => {
        const repo = await createRepository();

        const employee = await repo.createWithInitialSalary(newEmployee());
        const history = await repo.listSalaryHistory(employee.id);

        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({
          employeeId: employee.id,
          amount: 70_000,
          currency: "EUR",
          reason: "Starting salary",
          effectiveAt: new Date("2024-01-15T00:00:00.000Z"),
        });
      });

      it("rejects a duplicate email", async () => {
        const repo = await createRepository();
        await repo.createWithInitialSalary(newEmployee());

        await expect(
          repo.createWithInitialSalary(newEmployee({ fullName: "Someone Else" })),
        ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
      });
    });

    describe("findById", () => {
      it("returns the employee", async () => {
        const repo = await createRepository();
        const created = await repo.createWithInitialSalary(newEmployee());

        expect(await repo.findById(created.id)).toEqual(created);
      });

      it("returns null for an unknown id", async () => {
        const repo = await createRepository();

        expect(await repo.findById(UNKNOWN_ID)).toBeNull();
      });
    });

    describe("updateProfile", () => {
      it("changes only the given fields", async () => {
        const repo = await createRepository();
        const created = await repo.createWithInitialSalary(newEmployee());

        const updated = await repo.updateProfile(created.id, {
          jobTitle: "Senior Software Engineer",
        });

        expect(updated).toEqual({ ...created, jobTitle: "Senior Software Engineer" });
        expect(await repo.findById(created.id)).toEqual(updated);
      });

      it("leaves salary and history untouched", async () => {
        const repo = await createRepository();
        const created = await repo.createWithInitialSalary(newEmployee());

        await repo.updateProfile(created.id, { fullName: "Ada King" });

        expect((await repo.findById(created.id))?.currentSalary).toBe(70_000);
        expect(await repo.listSalaryHistory(created.id)).toHaveLength(1);
      });

      it("allows an employee to keep their own email", async () => {
        const repo = await createRepository();
        const created = await repo.createWithInitialSalary(newEmployee());

        const updated = await repo.updateProfile(created.id, { email: "ada@example.com" });

        expect(updated?.email).toBe("ada@example.com");
      });

      it("rejects an email that belongs to someone else", async () => {
        const repo = await createRepository();
        await repo.createWithInitialSalary(newEmployee());
        const other = await repo.createWithInitialSalary(
          newEmployee({ email: "grace@example.com" }),
        );

        await expect(
          repo.updateProfile(other.id, { email: "ada@example.com" }),
        ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
      });

      it("returns null for an unknown id", async () => {
        const repo = await createRepository();

        expect(await repo.updateProfile(UNKNOWN_ID, { fullName: "Nobody" })).toBeNull();
      });
    });

    describe("applySalaryChange", () => {
      const effectiveAt = new Date("2025-06-01T00:00:00.000Z");

      it("updates the current salary and adds a history record in the employee's currency", async () => {
        const repo = await createRepository();
        const created = await repo.createWithInitialSalary(newEmployee());

        const result = await repo.applySalaryChange({
          employeeId: created.id,
          expectedCurrentSalary: 70_000,
          newAmount: 78_000,
          effectiveAt,
          reason: "Promotion",
        });

        expect(result?.employee).toMatchObject({ id: created.id, currentSalary: 78_000 });
        expect(result?.record).toMatchObject({
          employeeId: created.id,
          amount: 78_000,
          currency: "EUR",
          effectiveAt,
          reason: "Promotion",
        });
        expect((await repo.findById(created.id))?.currentSalary).toBe(78_000);
      });

      it("lists history newest first and keeps the older records", async () => {
        const repo = await createRepository();
        const created = await repo.createWithInitialSalary(newEmployee());
        await repo.applySalaryChange({
          employeeId: created.id,
          expectedCurrentSalary: 70_000,
          newAmount: 75_000,
          effectiveAt: new Date("2025-01-01T00:00:00.000Z"),
          reason: null,
        });
        await repo.applySalaryChange({
          employeeId: created.id,
          expectedCurrentSalary: 75_000,
          newAmount: 82_000,
          effectiveAt: new Date("2026-01-01T00:00:00.000Z"),
          reason: null,
        });

        const history = await repo.listSalaryHistory(created.id);

        expect(history.map((record) => record.amount)).toEqual([82_000, 75_000, 70_000]);
      });

      it("writes nothing when the salary changed since it was read", async () => {
        const repo = await createRepository();
        const created = await repo.createWithInitialSalary(newEmployee());

        const result = await repo.applySalaryChange({
          employeeId: created.id,
          expectedCurrentSalary: 65_000,
          newAmount: 90_000,
          effectiveAt,
          reason: null,
        });

        expect(result).toBeNull();
        expect((await repo.findById(created.id))?.currentSalary).toBe(70_000);
        expect(await repo.listSalaryHistory(created.id)).toHaveLength(1);
      });

      it("writes nothing for a deactivated employee", async () => {
        const repo = await createRepository();
        const created = await repo.createWithInitialSalary(newEmployee());
        await repo.deactivate(created.id, new Date("2026-03-01T00:00:00.000Z"));

        const result = await repo.applySalaryChange({
          employeeId: created.id,
          expectedCurrentSalary: 70_000,
          newAmount: 90_000,
          effectiveAt,
          reason: null,
        });

        expect(result).toBeNull();
        expect(await repo.listSalaryHistory(created.id)).toHaveLength(1);
      });

      it("returns null for an unknown employee", async () => {
        const repo = await createRepository();

        const result = await repo.applySalaryChange({
          employeeId: UNKNOWN_ID,
          expectedCurrentSalary: 1,
          newAmount: 2,
          effectiveAt,
          reason: null,
        });

        expect(result).toBeNull();
      });
    });

    describe("deactivate", () => {
      it("marks the employee inactive and keeps their salary history", async () => {
        const repo = await createRepository();
        const created = await repo.createWithInitialSalary(newEmployee());
        const at = new Date("2026-03-01T10:00:00.000Z");

        const result = await repo.deactivate(created.id, at);

        expect(result).toMatchObject({ isActive: false, deactivatedAt: at, currentSalary: 70_000 });
        expect(await repo.listSalaryHistory(created.id)).toHaveLength(1);
      });

      it("keeps the original date when deactivated twice", async () => {
        const repo = await createRepository();
        const created = await repo.createWithInitialSalary(newEmployee());
        const first = new Date("2026-03-01T10:00:00.000Z");
        await repo.deactivate(created.id, first);

        const again = await repo.deactivate(created.id, new Date("2026-09-09T09:00:00.000Z"));

        expect(again?.deactivatedAt).toEqual(first);
      });

      it("returns null for an unknown id", async () => {
        const repo = await createRepository();

        expect(await repo.deactivate(UNKNOWN_ID, new Date())).toBeNull();
      });
    });
  });
}
