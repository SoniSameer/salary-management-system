import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryEmployeeRepository } from "@/test/fakes/in-memory-employee-repository";
import type { CreateEmployeeInput } from "./employee-schemas";
import { EmployeeService } from "./employee-service";
import { EmailAlreadyExistsError, EmployeeNotFoundError } from "./errors";

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
const NOW = new Date("2026-05-20T09:30:00.000Z");

const validInput: CreateEmployeeInput = {
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  country: "Germany",
  department: "Engineering",
  jobTitle: "Software Engineer",
  currency: "EUR",
  salary: 70_000,
  hiredAt: new Date("2024-01-15T00:00:00.000Z"),
};

describe("EmployeeService", () => {
  let repository: InMemoryEmployeeRepository;
  let service: EmployeeService;

  beforeEach(() => {
    repository = new InMemoryEmployeeRepository();
    service = new EmployeeService(repository, () => NOW);
  });

  describe("create", () => {
    it("creates an active employee paid the starting salary", async () => {
      const employee = await service.create(validInput);

      expect(employee).toMatchObject({
        fullName: "Ada Lovelace",
        currency: "EUR",
        currentSalary: 70_000,
        isActive: true,
      });
    });

    it("records the starting salary as the first history entry on the hire date", async () => {
      const employee = await service.create(validInput);

      const history = await repository.listSalaryHistory(employee.id);

      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        amount: 70_000,
        currency: "EUR",
        reason: "Starting salary",
        effectiveAt: validInput.hiredAt,
      });
    });

    it("rejects a duplicate email", async () => {
      await service.create(validInput);

      await expect(service.create(validInput)).rejects.toBeInstanceOf(EmailAlreadyExistsError);
    });
  });

  describe("update", () => {
    it("changes the given profile fields", async () => {
      const created = await service.create(validInput);

      const updated = await service.update(created.id, { jobTitle: "Staff Engineer" });

      expect(updated).toMatchObject({ jobTitle: "Staff Engineer", fullName: "Ada Lovelace" });
    });

    it("does not change salary or add history", async () => {
      const created = await service.create(validInput);

      const updated = await service.update(created.id, { department: "Product" });

      expect(updated.currentSalary).toBe(70_000);
      expect(await repository.listSalaryHistory(created.id)).toHaveLength(1);
    });

    it("throws when the employee does not exist", async () => {
      await expect(service.update(UNKNOWN_ID, { fullName: "Nobody" })).rejects.toBeInstanceOf(
        EmployeeNotFoundError,
      );
    });

    it("rejects an email used by another employee", async () => {
      await service.create(validInput);
      const other = await service.create({ ...validInput, email: "grace@example.com" });

      await expect(service.update(other.id, { email: "ada@example.com" })).rejects.toBeInstanceOf(
        EmailAlreadyExistsError,
      );
    });

    it("still lets HR correct the profile of a deactivated employee", async () => {
      const created = await service.create(validInput);
      await service.deactivate(created.id);

      const updated = await service.update(created.id, { fullName: "Ada King" });

      expect(updated).toMatchObject({ fullName: "Ada King", isActive: false });
    });
  });

  describe("deactivate", () => {
    it("deactivates the employee at the current time", async () => {
      const created = await service.create(validInput);

      const result = await service.deactivate(created.id);

      expect(result).toMatchObject({ isActive: false, deactivatedAt: NOW });
    });

    it("keeps the employee and their salary history", async () => {
      const created = await service.create(validInput);

      await service.deactivate(created.id);

      expect(await repository.findById(created.id)).not.toBeNull();
      expect(await repository.listSalaryHistory(created.id)).toHaveLength(1);
    });

    it("is safe to repeat and keeps the first deactivation date", async () => {
      const created = await service.create(validInput);
      await service.deactivate(created.id);
      const later = new EmployeeService(repository, () => new Date("2027-01-01T00:00:00.000Z"));

      const again = await later.deactivate(created.id);

      expect(again.deactivatedAt).toEqual(NOW);
    });

    it("throws when the employee does not exist", async () => {
      await expect(service.deactivate(UNKNOWN_ID)).rejects.toBeInstanceOf(EmployeeNotFoundError);
    });
  });
});
