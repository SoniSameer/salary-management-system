import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { COLUMNS } from "../employee-columns";

const SKELETON_ROWS = 8;
const SKELETON_COLUMNS = COLUMNS.length;

/** Placeholder rows shown while the first page loads. Hidden from screen readers. */
export function LoadingRows() {
  return (
    <TableBody aria-hidden="true">
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <TableRow key={row} className="min-h-16">
          {Array.from({ length: SKELETON_COLUMNS }, (_, column) => (
            <TableCell key={column} className="px-3 py-4">
              <Skeleton className={`h-4 ${column === 0 ? "w-44" : "w-full"}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="surface-card flex flex-col items-start gap-4 border-destructive/25 bg-destructive/5 p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-full text-lg">!</span>
        <div>
          <p className="font-semibold">Could not load employees</p>
          <p className="text-muted-foreground mt-1 text-sm">{message}</p>
        </div>
      </div>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

interface EmptyStateProps {
  /** Which of the three reasons the list is empty. */
  reason: "no-employees" | "filtered" | "past-last-page";
  onClearFilters: () => void;
  onFirstPage: () => void;
}

export function EmptyState({ reason, onClearFilters, onFirstPage }: EmptyStateProps) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 border-dashed p-14 text-center">
      <span aria-hidden="true" className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full text-xl">⌕</span>
      {reason === "no-employees" && (
        <>
          <p className="font-semibold">No employees yet</p>
          <p className="text-muted-foreground text-sm">Employees you add will appear here.</p>
        </>
      )}
      {reason === "filtered" && (
        <>
          <p className="font-semibold">No employees match your filters</p>
          <p className="text-muted-foreground text-sm">Try a different search or remove a filter.</p>
          <Button variant="outline" onClick={onClearFilters}>
            Show all employees
          </Button>
        </>
      )}
      {reason === "past-last-page" && (
        <>
          <p className="font-semibold">This page is past the end of the list</p>
          <Button variant="outline" onClick={onFirstPage}>
            Go to the first page
          </Button>
        </>
      )}
    </div>
  );
}
