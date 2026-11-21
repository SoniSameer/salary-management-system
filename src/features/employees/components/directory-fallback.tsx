import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COLUMNS } from "../employee-columns";
import { LoadingRows } from "./directory-states";

/**
 * Server-safe placeholder shown while the directory loads. It has no click
 * handlers, so the server can render it in the page's static HTML.
 */
export function DirectoryFallback() {
  return (
    <div className="surface-card overflow-hidden">
      <p role="status" className="sr-only">
        Loading employees…
      </p>
      <Table aria-label="Employees" aria-busy="true" className="min-w-[900px]">
        <TableHeader>
          <TableRow className="bg-muted/45 hover:bg-muted/45">
            {COLUMNS.map((column) => (
              <TableHead key={column.label} scope="col" className={`h-11 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase ${column.align === "right" ? "text-right" : ""}`}>
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
