import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COLUMNS } from "../employee-columns";
import { LoadingRows } from "./directory-states";

/**
 * Server-safe placeholder shown while the directory loads. It has no click
 * handlers, so the server can render it in the page's static HTML.
 */
export function DirectoryFallback() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading employees…
      </p>
      <Table aria-label="Employees" aria-busy="true">
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column.label} scope="col" className={column.align === "right" ? "text-right" : undefined}>
                {column.visuallyHidden ? <span className="sr-only">{column.label}</span> : column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <LoadingRows />
      </Table>
    </div>
  );
}
