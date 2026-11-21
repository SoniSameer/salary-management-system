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

// The pale --chart-1 is too faint on white. --chart-3 keeps good contrast and is still a theme color.
const BAR_COLOR = "var(--chart-3)";

export function DistributionChart({ buckets, currency }: DistributionChartProps) {
  const summary = describeDistribution(buckets, currency);
  const data = buckets.map((bucket) => ({
    label: bucketLabel(bucket, currency),
    range: bucketRange(bucket, currency),
    count: bucket.count,
  }));

  return (
    <section aria-labelledby="distribution-heading" className="flex flex-col gap-3">
      <h2 id="distribution-heading" className="text-base font-medium">
        Salary distribution
      </h2>
      <p className="text-sm">{summary.sentence}</p>

      {/* A chart is a picture, so it gets a full text description. The same data is also available as a table. */}
      <div role="img" aria-label={summary.chartLabel} className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 288 }}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} width={44} tick={{ fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              labelFormatter={(_, payload) => String(payload?.[0]?.payload?.range ?? "")}
              formatter={(value) => [`${formatNumber(Number(value))} employees`, ""]}
              separator=""
            />
            {/* No animation: it is distracting, and some users ask their system to reduce motion. */}
            <Bar dataKey="count" name="Employees" fill={BAR_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer underline-offset-4 hover:underline">Show data table</summary>
        <Table aria-label="Salary distribution data" className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Salary range</TableHead>
              <TableHead scope="col" className="text-right">
                Employees
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.range}>
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
