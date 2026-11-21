import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatNumber } from "@/lib/format";
import type { GroupStats } from "../api-client";

interface StatsTableProps {
  /** Names the table for assistive technology, for example "Salary by country". */
  title: string;
  /** The first column's header, for example "Country". */
  groupLabel: string;
  groups: GroupStats[];
  currency: string;
}

function averageTint(average: number, groups: GroupStats[]): string {
  const max = Math.max(...groups.map((group) => group.average));
  const ratio = max > 0 ? Math.min(1, average / max) : 0;
  return `linear-gradient(90deg, color-mix(in oklab, var(--primary) ${Math.round(12 + ratio * 28)}%, transparent), transparent 76%)`;
}

export function StatsTable({ title, groupLabel, groups, currency }: StatsTableProps) {
  const headingId = `${groupLabel.toLowerCase().replace(/\s+/g, "-")}-heading`;

  return (
    <section aria-labelledby={headingId} className="surface-card flex flex-col gap-3 overflow-hidden p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <span className="text-muted-foreground text-xs font-medium">{currency}</span>
      </div>
      <Table aria-label={title} className="min-w-[760px]">
        <TableHeader>
          <TableRow className="bg-muted/45 hover:bg-muted/45">
            <TableHead scope="col" className="h-10 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{groupLabel}</TableHead>
            <TableHead scope="col" className="h-10 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Employees</TableHead>
            <TableHead scope="col" className="h-10 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Lowest</TableHead>
            <TableHead scope="col" className="h-10 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Average</TableHead>
            <TableHead scope="col" className="h-10 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Median</TableHead>
            <TableHead scope="col" className="h-10 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Highest</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.name} className="hover:bg-accent/35">
              <TableHead scope="row" className="px-3 py-3 font-semibold">{group.name}</TableHead>
              <TableCell className="px-3 py-3 text-right tabular-nums">{formatNumber(group.headcount)}</TableCell>
              <TableCell className="px-3 py-3 text-right tabular-nums">{formatMoney(group.min, currency)}</TableCell>
              <TableCell style={{ backgroundImage: averageTint(group.average, groups) }} className="px-3 py-3 text-right font-semibold tabular-nums">{formatMoney(group.average, currency)}</TableCell>
              <TableCell className="px-3 py-3 text-right tabular-nums">{formatMoney(group.median, currency)}</TableCell>
              <TableCell className="px-3 py-3 text-right tabular-nums">{formatMoney(group.max, currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
