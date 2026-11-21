import { Button } from "@/components/ui/button";

interface PaginationProps {
  /** The page being requested. Buttons move relative to this. */
  currentPage: number;
  /** Page position and total as reported by the last response. */
  shownPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, shownPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t px-1 pt-4">
      <span className="text-muted-foreground text-sm tabular-nums">{`Page ${shownPage} of ${totalPages}`}</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-label="Previous page"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="Next page"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
