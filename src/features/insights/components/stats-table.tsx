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

export function StatsTable({ title, groupLabel, groups, currency }: StatsTableProps) {
  const headingId = `${groupLabel.toLowerCase().replace(/\s+/g, "-")}-heading`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-medium">
        {title}
      </h2>
      <Table aria-label={title}>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{groupLabel}</TableHead>
            <TableHead scope="col" className="text-right">
              Employees
            </TableHead>
            <TableHead scope="col" className="text-right">
              Lowest
            </TableHead>
            <TableHead scope="col" className="text-right">
              Average
            </TableHead>
            <TableHead scope="col" className="text-right">
              Median
            </TableHead>
            <TableHead scope="col" className="text-right">
              Highest
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.name}>
              <TableHead scope="row" className="font-medium">
                {group.name}
              </TableHead>
              <TableCell className="text-right tabular-nums">{formatNumber(group.headcount)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(group.min, currency)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(group.average, currency)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(group.median, currency)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(group.max, currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
