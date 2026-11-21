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

export function EmployeeTable({ employees, query, busy, onSort }: EmployeeTableProps) {
  return (
    <Table aria-label="Employees" aria-busy={busy}>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead
              key={column.label}
              scope="col"
              aria-sort={ariaSort(query, column.sortField)}
              className={column.align === "right" ? "text-right" : undefined}
            >
              {column.sortField ? (
                <SortButton column={column} query={query} onSort={onSort} />
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
      className="hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded outline-none focus-visible:ring-3"
    >
      {column.label}
      <span aria-hidden="true" className="text-muted-foreground w-3 text-xs">
        {active ? (query.sortOrder === "asc" ? "▲" : "▼") : ""}
      </span>
    </button>
  );
}

function EmployeeRow({ employee }: { employee: EmployeeDto }) {
  return (
    <TableRow>
      <TableCell>
        <Link href={`/employees/${employee.id}`} className="font-medium hover:underline">
          {employee.fullName}
        </Link>
        <div className="text-muted-foreground text-xs">{employee.email}</div>
      </TableCell>
      <TableCell>{employee.country}</TableCell>
      <TableCell>{employee.department}</TableCell>
      <TableCell>{employee.jobTitle}</TableCell>
      <TableCell>{formatDate(employee.hiredAt)}</TableCell>
      <TableCell className="text-right tabular-nums">
        <span>{formatMoney(employee.currentSalary, employee.currency)}</span>{" "}
        <span className="text-muted-foreground text-xs">{employee.currency}</span>
      </TableCell>
      <TableCell>
        <Badge variant={employee.isActive ? "secondary" : "outline"}>
          {employee.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
