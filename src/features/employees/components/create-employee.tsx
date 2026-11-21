"use client";

import { useRouter } from "next/navigation";
import { createEmployee, type NewEmployeePayload } from "../api-client";
import { EmployeeForm } from "./employee-form";

export function CreateEmployee() {
  const router = useRouter();

  async function create(payload: NewEmployeePayload): Promise<void> {
    const created = await createEmployee(payload);
    // Show the new person in the directory so the result is visible straight away.
    router.push(`/employees?search=${encodeURIComponent(created.email)}`);
  }

  return <EmployeeForm mode="create" onSubmit={create} />;
}
