"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import type { DistributionBucket } from "@/server/insights/insights";
import { bucketLabel, bucketRange, describeDistribution } from "../distribution-summary";

interface DistributionChartProps {
  buckets: DistributionBucket[];
  currency: string;
}

const BAR_COLOR = "var(--primary)";

export function DistributionChart({ buckets, currency }: DistributionChartProps) {
  const summary = describeDistribution(buckets, currency);
  const data = buckets.map((bucket) => ({
    label: bucketLabel(bucket, currency),
    range: bucketRange(bucket, currency),
    count: bucket.count,
    isPeak: summary.peak?.from === bucket.from,
  }));

  return (
    <section aria-labelledby="distribution-heading" className="surface-card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 id="distribution-heading" className="text-lg font-semibold tracking-tight">Salary distribution</h2>
          <span className="text-muted-foreground text-xs font-medium">{currency}</span>
        </div>
        <p className="text-sm">{summary.sentence}</p>
      </div>

      {/* A chart is a picture, so it gets a full text description. The same data is also available as a table. */}
      <div role="img" aria-label={summary.chartLabel} className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 288 }}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} width={44} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "var(--accent)" }}
              labelFormatter={(_, payload) => String(payload?.[0]?.payload?.range ?? "")}
              formatter={(value) => [`${formatNumber(Number(value))} employees`, ""]}
              separator=""
              contentStyle={{ borderRadius: "10px", border: "1px solid var(--border)", boxShadow: "var(--shadow-soft)", background: "var(--card)" }}
            />
            {/* No animation: it is distracting, and some users ask their system to reduce motion. */}
            <Bar dataKey="count" name="Employees" fill={BAR_COLOR} radius={[5, 5, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="text-sm">
        <summary className="text-primary cursor-pointer font-medium underline-offset-4 hover:underline">Show data table</summary>
        <Table aria-label="Salary distribution data" className="mt-3">
          <TableHeader>
            <TableRow className="bg-muted/45 hover:bg-muted/45">
              <TableHead scope="col">Salary range</TableHead>
              <TableHead scope="col" className="text-right">Employees</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.range} className={row.isPeak ? "bg-primary/5" : undefined}>
                <TableCell>{row.range}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.count)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </section>
  );
}
