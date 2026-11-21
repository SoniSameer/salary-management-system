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
    <Link
      href="/employees"
      className="border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:ring-ring inline-flex h-9 w-fit cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium shadow-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
    >
      <span aria-hidden="true" className="text-base leading-none">←</span> Back to employees
    </Link>
  );
}

export function EditEmployee({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const details = useEmployeeDetails(employeeId);
  // After a save, the saved employee becomes the baseline for "has anything changed".
  const [saved, setSaved] = useState<EmployeeDto | undefined>();

  if (details.error?.status === 404) return <div className="flex flex-col items-start gap-3"><p className="font-medium">Employee not found</p><p className="text-muted-foreground text-sm">They may have been removed, or the link is wrong.</p><BackLink /></div>;
  if (details.error) return <div role="alert" className="surface-card flex flex-col items-start gap-4 border-destructive/25 bg-destructive/5 p-6"><div><p className="font-semibold">Could not load this employee</p><p className="text-muted-foreground mt-1 text-sm">{details.error.message}</p></div><Button variant="outline" onClick={details.retry}>Try again</Button></div>;
  if (!details.data) return <div role="status" className="surface-card flex items-center gap-3 p-6 text-sm text-muted-foreground"><span aria-hidden="true" className="border-primary/25 border-t-primary size-4 animate-spin rounded-full border-2" />Loading employee…</div>;

  const employee = saved ?? details.data.employee;
  async function save(patch: EmployeePatchPayload): Promise<void> { setSaved(await updateEmployee(employeeId, patch)); }
  async function deactivate(): Promise<void> { await deactivateEmployee(employeeId); router.push("/employees"); }

  return <div className="flex flex-col gap-7"><div className="border-border/70 flex items-center border-b pb-4"><BackLink /></div><div className="space-y-1"><p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">People operations</p><h1 className="text-3xl font-semibold tracking-tight">Edit employee</h1></div>
    {!employee.isActive && <p className="border-border bg-muted/70 rounded-lg border p-3 text-sm">{`This employee was deactivated on ${formatDate(employee.deactivatedAt)}. Their record and salary history are kept.`}</p>}
    <section className="surface-card p-5 sm:p-7"><EmployeeForm mode="edit" employee={employee} onSubmit={save} /></section>
    {employee.isActive && <section aria-labelledby="deactivate-heading" className="border-destructive/25 bg-destructive/5 flex max-w-3xl flex-col gap-4 rounded-xl border p-5 sm:p-6"><div><h2 id="deactivate-heading" className="text-base font-semibold text-destructive">Danger zone</h2><p className="text-muted-foreground mt-1 text-sm">Deactivate this employee when they leave. Their record and salary history will be kept.</p></div><div><DeactivateEmployeeDialog employeeName={employee.fullName} onConfirm={deactivate} /></div></section>}
  </div>;
}
