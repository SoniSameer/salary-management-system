import { formatMoney, formatNumber } from "@/lib/format";
import type { SalaryStats } from "../api-client";

interface SummaryProps {
  stats: SalaryStats;
  currency: string;
}

export function Summary({ stats, currency }: SummaryProps) {
  const cards = [
    { label: "Employees", value: formatNumber(stats.headcount), icon: "people" },
    { label: "Average salary", value: formatMoney(stats.average, currency), icon: "average" },
    { label: "Median salary", value: formatMoney(stats.median, currency), icon: "median" },
    { label: "Lowest salary", value: formatMoney(stats.min, currency), icon: "lowest" },
    { label: "Highest salary", value: formatMoney(stats.max, currency), icon: "highest" },
  ];

  return (
    <section aria-label="Summary" className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">{`Summary for ${currency}`}</h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="surface-card flex min-h-[118px] flex-col justify-between p-4 transition-shadow duration-150 hover:shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{card.label}</dt>
              <span aria-hidden="true" className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg text-[10px] font-bold">
                {card.icon === "people" ? "#" : card.icon === "average" ? "AVG" : card.icon === "median" ? "MED" : card.icon === "lowest" ? "MIN" : "MAX"}
              </span>
            </div>
            <dd className="text-2xl font-semibold tracking-tight tabular-nums">{card.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-xs">
        Salaries are annual. The median is the middle salary: half of employees earn less and half earn more.
      </p>
    </section>
  );
}
