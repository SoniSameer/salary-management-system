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
        <TableRow key={row}>
          {Array.from({ length: SKELETON_COLUMNS }, (_, column) => (
            <TableCell key={column}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="border-destructive/30 bg-destructive/5 flex flex-col items-start gap-3 rounded-lg border p-6">
      <div>
        <p className="font-medium">Could not load employees</p>
        <p className="text-muted-foreground text-sm">{message}</p>
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
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      {reason === "no-employees" && (
        <>
          <p className="font-medium">No employees yet</p>
          <p className="text-muted-foreground text-sm">Employees you add will appear here.</p>
        </>
      )}
      {reason === "filtered" && (
        <>
          <p className="font-medium">No employees match your filters</p>
          <p className="text-muted-foreground text-sm">Try a different search or remove a filter.</p>
          <Button variant="outline" onClick={onClearFilters}>
            Show all employees
          </Button>
        </>
      )}
      {reason === "past-last-page" && (
        <>
          <p className="font-medium">This page is past the end of the list</p>
          <Button variant="outline" onClick={onFirstPage}>
            Go to the first page
          </Button>
        </>
      )}
    </div>
  );
}
