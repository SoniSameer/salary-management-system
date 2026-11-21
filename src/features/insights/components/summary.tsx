import { formatMoney, formatNumber } from "@/lib/format";
import type { SalaryStats } from "../api-client";

interface SummaryProps {
  stats: SalaryStats;
  currency: string;
}

export function Summary({ stats, currency }: SummaryProps) {
  const cards = [
    { label: "Employees", value: formatNumber(stats.headcount) },
    { label: "Average salary", value: formatMoney(stats.average, currency) },
    { label: "Median salary", value: formatMoney(stats.median, currency) },
    { label: "Lowest salary", value: formatMoney(stats.min, currency) },
    { label: "Highest salary", value: formatMoney(stats.max, currency) },
  ];

  return (
    <section aria-label="Summary" className="flex flex-col gap-3">
      <h2 className="text-base font-medium">{`Summary for ${currency}`}</h2>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="flex flex-col gap-1 rounded-lg border p-4">
            <dt className="text-muted-foreground text-xs font-medium">{card.label}</dt>
            <dd className="text-xl font-semibold tabular-nums">{card.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-xs">
        Salaries are annual. The median is the middle salary: half of employees earn less and half earn more.
      </p>
    </section>
  );
}
