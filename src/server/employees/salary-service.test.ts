import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryEmployeeRepository } from "@/test/fakes/in-memory-employee-repository";
import { newEmployee } from "./employee-repository.contract";
import {
  ConcurrentSalaryChangeError,
  EmployeeInactiveError,
  EmployeeNotFoundError,
  SalaryUnchangedError,
} from "./errors";
import { SalaryService } from "./salary-service";

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
const NOW = new Date("2026-05-20T09:30:00.000Z");

describe("SalaryService.changeSalary", () => {
  let repository: InMemoryEmployeeRepository;
  let service: SalaryService;
  let employeeId: string;

  beforeEach(async () => {
    repository = new InMemoryEmployeeRepository();
    service = new SalaryService(repository, () => NOW);
    employeeId = (await repository.createWithInitialSalary(newEmployee())).id;
  });

  it("changes the current salary", async () => {
    const result = await service.changeSalary(employeeId, { salary: 78_000, reason: "Promotion" });

    expect(result.employee.currentSalary).toBe(78_000);
    expect((await repository.findById(employeeId))?.currentSalary).toBe(78_000);
  });

  it("records the change in the employee's own currency, effective now", async () => {
    const result = await service.changeSalary(employeeId, { salary: 78_000, reason: "Promotion" });

    expect(result.record).toMatchObject({
      employeeId,
      amount: 78_000,
      currency: "EUR",
      effectiveAt: NOW,
      reason: "Promotion",
    });
  });

  it("stores no reason as null", async () => {
    const result = await service.changeSalary(employeeId, { salary: 78_000 });

    expect(result.record.reason).toBeNull();
  });

  it("keeps earlier history and puts the new record first", async () => {
    await service.changeSalary(employeeId, { salary: 78_000 });

    const history = await repository.listSalaryHistory(employeeId);

    expect(history.map((record) => record.amount)).toEqual([78_000, 70_000]);
  });

  it("allows a pay cut", async () => {
    const result = await service.changeSalary(employeeId, { salary: 60_000 });

    expect(result.employee.currentSalary).toBe(60_000);
  });

  it("rejects a change to the same salary and adds no history", async () => {
    await expect(service.changeSalary(employeeId, { salary: 70_000 })).rejects.toBeInstanceOf(
      SalaryUnchangedError,
    );

    expect(await repository.listSalaryHistory(employeeId)).toHaveLength(1);
  });

  it("rejects a change for a deactivated employee", async () => {
    await repository.deactivate(employeeId, NOW);

    await expect(service.changeSalary(employeeId, { salary: 90_000 })).rejects.toBeInstanceOf(
      EmployeeInactiveError,
    );

    expect((await repository.findById(employeeId))?.currentSalary).toBe(70_000);
    expect(await repository.listSalaryHistory(employeeId)).toHaveLength(1);
  });

  it("rejects an unknown employee", async () => {
    await expect(service.changeSalary(UNKNOWN_ID, { salary: 90_000 })).rejects.toBeInstanceOf(
      EmployeeNotFoundError,
    );
  });

  it("reports a conflict when someone else changed the salary first", async () => {
    // Simulates another HR user winning the race between our read and write.
    vi.spyOn(repository, "applySalaryChange").mockResolvedValueOnce(null);

    await expect(service.changeSalary(employeeId, { salary: 90_000 })).rejects.toBeInstanceOf(
      ConcurrentSalaryChangeError,
    );
  });

  it("passes the salary it read as the expected value", async () => {
    const spy = vi.spyOn(repository, "applySalaryChange");

    await service.changeSalary(employeeId, { salary: 78_000, reason: "Promotion" });

    expect(spy).toHaveBeenCalledWith({
      employeeId,
      expectedCurrentSalary: 70_000,
      newAmount: 78_000,
      effectiveAt: NOW,
      reason: "Promotion",
    });
  });
});
