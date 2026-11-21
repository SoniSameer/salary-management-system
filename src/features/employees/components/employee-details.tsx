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

function BackLink() {
  return (
    <Link href="/employees" className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <span aria-hidden="true">←</span> Back to employees
    </Link>
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

  const { employee, salaryHistory } = updated ?? details.data;
  const rows = buildHistoryRows(salaryHistory);

  function applyChange(result: SalaryChangeResultDto) {
    const base = updated ?? details.data!;
    setUpdated({ employee: result.employee, salaryHistory: [result.record, ...base.salaryHistory] });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <BackLink />
      </div>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{employee.fullName}</h1>
          <Badge variant={employee.isActive ? "secondary" : "outline"}>
            {employee.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/employees/${employee.id}/edit`} className={buttonVariants({ variant: "outline" })}>
            Edit profile
          </Link>
          {employee.isActive && <ChangeSalaryDialog employee={employee} onChanged={applyChange} />}
        </div>
      </header>

      {!employee.isActive && (
        <p className="bg-muted rounded-lg p-3 text-sm">
          {`This employee was deactivated on ${formatDate(employee.deactivatedAt)}. Their record and salary history are kept, and their salary can no longer be changed.`}
        </p>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="profile-heading" className="flex flex-col gap-3">
          <h2 id="profile-heading" className="text-base font-medium">
            Profile
          </h2>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd>{employee.email}</dd>
            <dt className="text-muted-foreground">Country</dt>
            <dd>{employee.country}</dd>
            <dt className="text-muted-foreground">Department</dt>
            <dd>{employee.department}</dd>
            <dt className="text-muted-foreground">Job title</dt>
            <dd>{employee.jobTitle}</dd>
            <dt className="text-muted-foreground">Hired</dt>
            <dd>{formatDate(employee.hiredAt)}</dd>
          </dl>
        </section>

        <section aria-labelledby="current-salary-heading" className="flex flex-col gap-3">
          <h2 id="current-salary-heading" className="text-base font-medium">
            Current salary
          </h2>
          <p>
            <span className="text-3xl font-semibold tabular-nums">
              {formatMoney(employee.currentSalary, employee.currency)}
            </span>{" "}
            <span className="text-muted-foreground text-sm">{employee.currency}</span>
          </p>
          <p className="text-muted-foreground text-sm">Per year</p>
        </section>
      </div>

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <h2 id="history-heading" className="text-base font-medium">
          Salary history
        </h2>
        <Table aria-labelledby="history-heading">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Effective</TableHead>
              <TableHead scope="col" className="text-right">
                Salary
              </TableHead>
              <TableHead scope="col" className="text-right">
                Change
              </TableHead>
              <TableHead scope="col">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDate(row.effectiveAt)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(row.amount, row.currency)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatChange(row.change, row.currency)}</TableCell>
                <TableCell>{row.reason ?? "–"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
