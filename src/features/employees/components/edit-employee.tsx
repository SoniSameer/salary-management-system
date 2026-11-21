"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { deactivateEmployee, updateEmployee, type EmployeeDto, type EmployeePatchPayload } from "../api-client";
import { useEmployeeDetails } from "../use-employee-details";
import { DeactivateEmployeeDialog } from "./deactivate-employee-dialog";
import { EmployeeForm } from "./employee-form";

function BackLink() {
  return (
    <Link href="/employees" className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <span aria-hidden="true">←</span> Back to employees
    </Link>
  );
}

export function EditEmployee({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const details = useEmployeeDetails(employeeId);
  // After a save, the saved employee becomes the baseline for "has anything changed".
  const [saved, setSaved] = useState<EmployeeDto | undefined>();

  if (details.error?.status === 404) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="font-medium">Employee not found</p>
        <p className="text-muted-foreground text-sm">They may have been removed, or the link is wrong.</p>
        <BackLink />
      </div>
    );
  }

  if (details.error) {
    return (
      <div role="alert" className="border-destructive/30 bg-destructive/5 flex flex-col items-start gap-3 rounded-lg border p-6">
        <div>
          <p className="font-medium">Could not load this employee</p>
          <p className="text-muted-foreground text-sm">{details.error.message}</p>
        </div>
        <Button variant="outline" onClick={details.retry}>
          Try again
        </Button>
      </div>
    );
  }

  if (!details.data) {
    return (
      <p role="status" className="text-muted-foreground text-sm">
        Loading employee…
      </p>
    );
  }

  const employee = saved ?? details.data.employee;

  async function save(patch: EmployeePatchPayload): Promise<void> {
    setSaved(await updateEmployee(employeeId, patch));
  }

  async function deactivate(): Promise<void> {
    await deactivateEmployee(employeeId);
    router.push("/employees");
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <BackLink />
      </div>

      {!employee.isActive && (
        <p className="bg-muted rounded-lg p-3 text-sm">
          {`This employee was deactivated on ${formatDate(employee.deactivatedAt)}. Their record and salary history are kept.`}
        </p>
      )}

      <EmployeeForm mode="edit" employee={employee} onSubmit={save} />

      {employee.isActive && (
        <section aria-labelledby="deactivate-heading" className="flex max-w-2xl flex-col gap-3 border-t pt-6">
          <h2 id="deactivate-heading" className="text-base font-medium">
            Deactivate employee
          </h2>
          <p className="text-muted-foreground text-sm">
            Use this when someone leaves. Employees are never deleted, so their salary history is kept.
          </p>
          <div>
            <DeactivateEmployeeDialog employeeName={employee.fullName} onConfirm={deactivate} />
          </div>
        </section>
      )}
    </div>
  );
}
