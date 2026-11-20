import { describeEmployeeRepositoryContract } from "@/server/employees/employee-repository.contract";
import { InMemoryEmployeeRepository } from "./in-memory-employee-repository";

describeEmployeeRepositoryContract(
  "InMemoryEmployeeRepository",
  async () => new InMemoryEmployeeRepository(),
);
