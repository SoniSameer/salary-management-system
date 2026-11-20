import { describe, expect, it } from "vitest";
import type { EmployeeListQuery } from "./employee-list";
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

export function listQuery(overrides: Partial<EmployeeListQuery> = {}): EmployeeListQuery {
  return {
    status: "active",
    sortBy: "fullName",
    sortOrder: "asc",
    page: 1,
    pageSize: 25,
    ...overrides,
  };
}

interface DirectoryPerson {
  name: string;
  country: string;
  department: string;
  jobTitle: string;
  currency: string;
  salary: number;
  hiredAt: string;
  active?: boolean;
}

// A small, known directory. Names are plain ASCII so sort order is the same in
// JavaScript and in PostgreSQL regardless of collation.
const DIRECTORY: DirectoryPerson[] = [
  { name: "Ada Lovelace", country: "Germany", department: "Engineering", jobTitle: "Software Engineer", currency: "EUR", salary: 70_000, hiredAt: "2022-03-01" },
  { name: "Bruno Costa", country: "Brazil", department: "Operations", jobTitle: "Support Specialist", currency: "BRL", salary: 90_000, hiredAt: "2019-07-15" },
  { name: "Chen Wei", country: "Japan", department: "Engineering", jobTitle: "Software Engineer", currency: "JPY", salary: 8_000_000, hiredAt: "2024-01-10" },
  { name: "Dana Smith", country: "United States", department: "Sales", jobTitle: "Account Executive", currency: "USD", salary: 85_000, hiredAt: "2021-11-20" },
  { name: "Elena Rossi", country: "Germany", department: "Sales", jobTitle: "Account Executive", currency: "EUR", salary: 65_000, hiredAt: "2020-05-05" },
  { name: "Frank Miller", country: "Germany", department: "Engineering", jobTitle: "QA Engineer", currency: "EUR", salary: 60_000, hiredAt: "2018-09-09", active: false },
];

function emailFor(name: string): string {
  return `${name.split(" ")[0].toLowerCase()}@example.com`;
}

async function seedDirectory(repo: EmployeeRepository): Promise<void> {
  for (const person of DIRECTORY) {
    const hiredAt = new Date(`${person.hiredAt}T00:00:00.000Z`);
    const employee = await repo.createWithInitialSalary(
      newEmployee({
        fullName: person.name,
        email: emailFor(person.name),
        country: person.country,
        department: person.department,
        jobTitle: person.jobTitle,
        currency: person.currency,
        hiredAt,
        initialSalary: { amount: person.salary, effectiveAt: hiredAt, reason: "Starting salary" },
      }),
    );
    if (person.active === false) {
      await repo.deactivate(employee.id, new Date("2025-01-01T00:00:00.000Z"));
    }
  }
}

async function names(repo: EmployeeRepository, overrides: Partial<EmployeeListQuery>) {
  const result = await repo.list(listQuery(overrides));
  return result.items.map((employee) => employee.fullName);
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

    describe("list", () => {
      it("returns active employees sorted by name by default", async () => {
        const repo = await createRepository();
        await seedDirectory(repo);

        expect(await names(repo, {})).toEqual([
          "Ada Lovelace",
          "Bruno Costa",
          "Chen Wei",
          "Dana Smith",
          "Elena Rossi",
        ]);
      });

      it("filters by status", async () => {
        const repo = await createRepository();
        await seedDirectory(repo);

        expect(await names(repo, { status: "inactive" })).toEqual(["Frank Miller"]);
        expect(await names(repo, { status: "all" })).toHaveLength(6);
      });

      it.each([
        ["country", { country: "Germany" }, ["Ada Lovelace", "Elena Rossi"]],
        ["department", { department: "Engineering" }, ["Ada Lovelace", "Chen Wei"]],
        ["job title", { jobTitle: "Account Executive" }, ["Dana Smith", "Elena Rossi"]],
        ["currency", { currency: "EUR" }, ["Ada Lovelace", "Elena Rossi"]],
      ])("filters by %s", async (_label, filter, expected) => {
        const repo = await createRepository();
        await seedDirectory(repo);

        expect(await names(repo, filter)).toEqual(expected);
      });

      it("combines filters with AND", async () => {
        const repo = await createRepository();
        await seedDirectory(repo);

        expect(await names(repo, { country: "Germany", department: "Sales" })).toEqual([
          "Elena Rossi",
        ]);
      });

      it("returns an empty page and zero totals when nothing matches", async () => {
        const repo = await createRepository();
        await seedDirectory(repo);

        const result = await repo.list(listQuery({ country: "Atlantis" }));

        expect(result).toMatchObject({ items: [], total: 0, totalPages: 0, page: 1 });
      });

      it("searches names and emails, ignoring case", async () => {
        const repo = await createRepository();
        await seedDirectory(repo);

        expect(await names(repo, { search: "LOVE" })).toEqual(["Ada Lovelace"]);
        expect(await names(repo, { search: "bruno@" })).toEqual(["Bruno Costa"]);
        expect(await names(repo, { search: "zzz" })).toEqual([]);
      });

      it("treats % and _ in the search text literally, not as wildcards", async () => {
        const repo = await createRepository();
        await repo.createWithInitialSalary(
          newEmployee({ fullName: "Pat 100% Real", email: "pat.real@example.com" }),
        );
        await repo.createWithInitialSalary(
          newEmployee({ fullName: "Pat Plain", email: "pat.plain@example.com" }),
        );
        await repo.createWithInitialSalary(
          newEmployee({ fullName: "Pat Under_Score", email: "pat.under@example.com" }),
        );

        expect(await names(repo, { search: "100%" })).toEqual(["Pat 100% Real"]);
        expect(await names(repo, { search: "%" })).toEqual(["Pat 100% Real"]);
        expect(await names(repo, { search: "_" })).toEqual(["Pat Under_Score"]);
      });

      it("sorts by salary and by hire date in both directions", async () => {
        const repo = await createRepository();
        await seedDirectory(repo);

        expect(await names(repo, { sortBy: "currentSalary", sortOrder: "desc" })).toEqual([
          "Chen Wei",
          "Bruno Costa",
          "Dana Smith",
          "Ada Lovelace",
          "Elena Rossi",
        ]);
        expect(await names(repo, { sortBy: "hiredAt", sortOrder: "asc" })).toEqual([
          "Bruno Costa",
          "Elena Rossi",
          "Dana Smith",
          "Ada Lovelace",
          "Chen Wei",
        ]);
        expect(await names(repo, { sortOrder: "desc" })).toEqual([
          "Elena Rossi",
          "Dana Smith",
          "Chen Wei",
          "Bruno Costa",
          "Ada Lovelace",
        ]);
      });

      it("paginates and reports totals", async () => {
        const repo = await createRepository();
        await seedDirectory(repo);

        const first = await repo.list(listQuery({ pageSize: 2, page: 1 }));
        const last = await repo.list(listQuery({ pageSize: 2, page: 3 }));
        const beyond = await repo.list(listQuery({ pageSize: 2, page: 4 }));

        expect(first.items.map((e) => e.fullName)).toEqual(["Ada Lovelace", "Bruno Costa"]);
        expect(first).toMatchObject({ total: 5, totalPages: 3, page: 1, pageSize: 2 });
        expect(last.items.map((e) => e.fullName)).toEqual(["Elena Rossi"]);
        expect(beyond.items).toEqual([]);
        expect(beyond).toMatchObject({ total: 5, totalPages: 3 });
      });

      it("never repeats or drops a row across pages when sort values tie", async () => {
        const repo = await createRepository();
        for (let i = 1; i <= 7; i++) {
          await repo.createWithInitialSalary(
            newEmployee({ fullName: `Same Pay ${i}`, email: `same${i}@example.com` }),
          );
        }

        const seen: string[] = [];
        for (const page of [1, 2, 3]) {
          const result = await repo.list(
            listQuery({ sortBy: "currentSalary", pageSize: 3, page }),
          );
          seen.push(...result.items.map((employee) => employee.id));
        }

        expect(seen).toHaveLength(7);
        expect(new Set(seen).size).toBe(7);
      });

      it("returns the same employee shape as findById", async () => {
        const repo = await createRepository();
        const created = await repo.createWithInitialSalary(newEmployee());

        const result = await repo.list(listQuery());

        expect(result.items).toEqual([created]);
      });
    });

    describe("getFilterOptions", () => {
      it("returns sorted distinct values across all employees, including inactive ones", async () => {
        const repo = await createRepository();
        await seedDirectory(repo);

        expect(await repo.getFilterOptions()).toEqual({
          countries: ["Brazil", "Germany", "Japan", "United States"],
          departments: ["Engineering", "Operations", "Sales"],
          jobTitles: ["Account Executive", "QA Engineer", "Software Engineer", "Support Specialist"],
          currencies: ["BRL", "EUR", "JPY", "USD"],
        });
      });

      it("returns empty lists when there are no employees", async () => {
        const repo = await createRepository();

        expect(await repo.getFilterOptions()).toEqual({
          countries: [],
          departments: [],
          jobTitles: [],
          currencies: [],
        });
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
