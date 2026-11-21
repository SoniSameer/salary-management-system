"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import type { EmployeeDetailsDto, SalaryChangeResultDto } from "../api-client";
import { buildHistoryRows, formatChange } from "../salary-history";
import { useEmployeeDetails } from "../use-employee-details";
import { ChangeSalaryDialog } from "./change-salary-dialog";

function BackLink({ name }: { name?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      <Link href="/employees" className="text-muted-foreground hover:text-primary focus-visible:ring-ring rounded-md hover:underline focus-visible:ring-2 focus-visible:outline-none">
        <span className="sr-only">Back to employees</span>
        <span aria-hidden="true">Employees</span>
      </Link>
      {name && <><span aria-hidden="true" className="text-muted-foreground">/</span><span className="text-foreground font-medium">{name}</span></>}
    </nav>
  );
}

export function EmployeeDetails({ employeeId }: { employeeId: string }) {
  const details = useEmployeeDetails(employeeId);
  // After a salary change the API returns the new state, so the page updates in place.
  const [updated, setUpdated] = useState<EmployeeDetailsDto | undefined>();

  if (details.error?.status === 404) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="font-medium">Employee not found</p>
        <p className="text-muted-foreground text-sm">They may have been removed, or the link is wrong.</p>
        <Link href="/employees" className={buttonVariants({ variant: "outline" })}>Back to employees</Link>
      </div>
    );
  }

  if (details.error) {
    return (
      <div role="alert" className="surface-card flex flex-col items-start gap-4 border-destructive/25 bg-destructive/5 p-6">
        <div><p className="font-semibold">Could not load this employee</p><p className="text-muted-foreground mt-1 text-sm">{details.error.message}</p></div>
        <Button variant="outline" onClick={details.retry}>Try again</Button>
      </div>
    );
  }

  if (!details.data) {
    return <p role="status" className="text-muted-foreground text-sm">Loading employee…</p>;
  }

  const { employee, salaryHistory } = updated ?? details.data;
  const rows = buildHistoryRows(salaryHistory);

  function applyChange(result: SalaryChangeResultDto) {
    const base = updated ?? details.data!;
    setUpdated({ employee: result.employee, salaryHistory: [result.record, ...base.salaryHistory] });
  }

  return (
    <div className="flex flex-col gap-7">
      <BackLink name={employee.fullName} />

      <header className="surface-card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full text-sm font-semibold shadow-sm">
            {employee.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
          </span>
          <div><h1 className="text-2xl font-semibold tracking-tight">{employee.fullName}</h1><Badge className={employee.isActive ? "border-success/20 bg-success-soft text-success" : "bg-muted text-muted-foreground border-transparent"} variant={employee.isActive ? "secondary" : "outline"}><span aria-hidden="true" className={`size-1.5 rounded-full ${employee.isActive ? "bg-success" : "bg-muted-foreground"}`} />{employee.isActive ? "Active" : "Inactive"}</Badge></div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/employees/${employee.id}/edit`} className={buttonVariants({ variant: "outline" })}>Edit profile</Link>
          {employee.isActive && <ChangeSalaryDialog employee={employee} onChanged={applyChange} />}
        </div>
      </header>

      {!employee.isActive && <p className="border-border bg-muted/70 rounded-lg border p-3 text-sm">{`This employee was deactivated on ${formatDate(employee.deactivatedAt)}. Their record and salary history are kept, and their salary can no longer be changed.`}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="profile-heading" className="surface-card flex flex-col gap-4 p-5">
          <h2 id="profile-heading" className="text-lg font-semibold tracking-tight">Profile</h2>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm"><dt className="text-muted-foreground">Email</dt><dd>{employee.email}</dd><dt className="text-muted-foreground">Country</dt><dd>{employee.country}</dd><dt className="text-muted-foreground">Department</dt><dd>{employee.department}</dd><dt className="text-muted-foreground">Job title</dt><dd>{employee.jobTitle}</dd><dt className="text-muted-foreground">Hired</dt><dd>{formatDate(employee.hiredAt)}</dd></dl>
        </section>
        <section aria-labelledby="current-salary-heading" className="surface-card flex flex-col gap-4 p-5"><h2 id="current-salary-heading" className="text-lg font-semibold tracking-tight">Current salary</h2><p><span className="text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(employee.currentSalary, employee.currency)}</span>{" "}<span className="text-muted-foreground text-sm">{employee.currency}</span></p><p className="text-muted-foreground text-sm">Per year</p></section>
      </div>

      <section aria-labelledby="history-heading" className="surface-card flex flex-col gap-4 overflow-hidden p-4 sm:p-5"><h2 id="history-heading" className="text-lg font-semibold tracking-tight">Salary history</h2><Table aria-labelledby="history-heading" className="min-w-[680px]"><TableHeader><TableRow className="bg-muted/45 hover:bg-muted/45"><TableHead scope="col">Effective</TableHead><TableHead scope="col" className="text-right">Salary</TableHead><TableHead scope="col" className="text-right">Change</TableHead><TableHead scope="col">Reason</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => { const change = formatChange(row.change, row.currency); const positive = row.change && row.change.amount > 0; const negative = row.change && row.change.amount < 0; return <TableRow key={row.id} className="hover:bg-accent/35"><TableCell>{formatDate(row.effectiveAt)}</TableCell><TableCell className="text-right font-semibold tabular-nums">{formatMoney(row.amount, row.currency)}</TableCell><TableCell className="text-right tabular-nums">{row.change ? <Badge variant="outline" className={positive ? "border-success/25 bg-success-soft text-success" : negative ? "border-destructive/25 bg-destructive/5 text-destructive" : ""}>{change}</Badge> : change}</TableCell><TableCell>{row.reason ?? "–"}</TableCell></TableRow>; })}</TableBody></Table></section>
    </div>
  );
}
