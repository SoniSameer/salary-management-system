import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EmployeeListQuery, EmployeeSortField } from "@/server/employees/employee-list";
import { formatDate, formatMoney } from "@/lib/format";
import type { EmployeeDto } from "../api-client";
import { COLUMNS, type Column } from "../employee-columns";
import { LoadingRows } from "./directory-states";

interface EmployeeTableProps {
  /** Rows to show. Omit to show loading placeholders instead. */
  employees?: EmployeeDto[];
  query: EmployeeListQuery;
  /** True while a new page is loading. Rows stay visible but are marked busy. */
  busy: boolean;
  onSort: (field: EmployeeSortField) => void;
}

function ariaSort(query: EmployeeListQuery, field?: EmployeeSortField) {
  if (!field || query.sortBy !== field) return undefined;
  return query.sortOrder === "asc" ? "ascending" : "descending";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function EmployeeTable({ employees, query, busy, onSort }: EmployeeTableProps) {
  return (
    <div className="surface-card overflow-hidden">
      <Table aria-label="Employees" aria-busy={busy} className="min-w-[1040px] lg:min-w-0">
        <TableHeader>
          <TableRow className="bg-muted/45 hover:bg-muted/45">
            {COLUMNS.map((column) => (
              <TableHead
                key={column.label}
                scope="col"
                aria-sort={ariaSort(query, column.sortField)}
                className={`h-11 px-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase ${column.align === "right" ? "text-right" : ""} ${column.label === "Name" ? "pl-4 sm:pl-5" : ""}`}
              >
                {column.sortField ? (
                  <SortButton column={column} query={query} onSort={onSort} />
                ) : column.visuallyHidden ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        {employees ? (
          <TableBody className={busy ? "opacity-60 transition-opacity" : undefined}>
            {employees.map((employee) => (
              <EmployeeRow key={employee.id} employee={employee} />
            ))}
          </TableBody>
        ) : (
          <LoadingRows />
        )}
      </Table>
    </div>
  );
}

function SortButton({
  column,
  query,
  onSort,
}: {
  column: Column;
  query: EmployeeListQuery;
  onSort: (field: EmployeeSortField) => void;
}) {
  const field = column.sortField!;
  const active = query.sortBy === field;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="cursor-pointer hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-md outline-none transition-colors duration-150 focus-visible:ring-2"
    >
      {column.label}
      <span aria-hidden="true" className={`w-4 text-sm transition-colors duration-150 ${active ? "text-primary" : "text-muted-foreground/45 group-hover:text-primary/70"}`}>
        {active ? (query.sortOrder === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

function EmployeeRow({ employee }: { employee: EmployeeDto }) {
  return (
    <TableRow className="group min-h-16 hover:bg-accent/45">
      <TableCell className="px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm">
            {initials(employee.fullName)}
          </span>
          <div className="min-w-0">
            <Link href={`/employees/${employee.id}`} className="cursor-pointer text-primary hover:text-primary focus-visible:ring-ring rounded-md font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none" title="View profile and salary history">
              {employee.fullName}
            </Link>
            <div className="text-muted-foreground truncate text-xs">{employee.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>{employee.country}</TableCell>
      <TableCell>{employee.department}</TableCell>
      <TableCell>{employee.jobTitle}</TableCell>
      <TableCell>{formatDate(employee.hiredAt)}</TableCell>
      <TableCell className="text-right tabular-nums">
        <span className="font-semibold">{formatMoney(employee.currentSalary, employee.currency)}</span>{" "}
        <span className="text-muted-foreground text-xs">{employee.currency}</span>
      </TableCell>
      <TableCell>
        <Badge className={employee.isActive ? "border-success/20 bg-success-soft text-success" : "bg-muted text-muted-foreground border-transparent"} variant={employee.isActive ? "secondary" : "outline"}>
          <span aria-hidden="true" className={`size-1.5 rounded-full ${employee.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
          {employee.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {/* The name is in the label so a screen reader hears which row each link belongs to. */}
        <Link
          href={`/employees/${employee.id}/edit`}
          aria-label={`Edit ${employee.fullName}`}
          className="cursor-pointer text-muted-foreground border-border hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex h-8 items-center gap-1 rounded-md border px-2 text-sm font-medium opacity-70 transition-all duration-150 focus-visible:ring-2 focus-visible:outline-none group-hover:opacity-100" title="Edit details or deactivate"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3.25 12.75 1.05-3.35L10.9 2.8a1.35 1.35 0 0 1 1.9 1.9l-6.6 6.6-3.35 1.05Z" /><path d="m9.8 3.9 2.3 2.3" /><path d="m3.25 12.75 1.05-3.35 2.3 2.3-3.35 1.05Z" fill="currentColor" stroke="none" /></svg>
          <span className="hidden sm:inline">Edit</span>
        </Link>
      </TableCell>
    </TableRow>
  );
}
