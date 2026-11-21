"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect, type SelectOption } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { useApiResource } from "@/lib/use-api-resource";
import { fetchCurrencies, fetchDistribution, fetchInsights, type CurrencyHeadcount } from "../api-client";
import { DistributionChart } from "./distribution-chart";
import { StatsTable } from "./stats-table";
import { Summary } from "./summary";

/** A currency code from the URL, or null if it is missing or malformed. */
function parseCurrency(value: string | null): string | null {
  return value && /^[A-Za-z]{3}$/.test(value) ? value.toUpperCase() : null;
}

function currencyOptions(currencies: CurrencyHeadcount[], current: string | null): SelectOption[] {
  const options = currencies.map(({ currency, headcount }) => ({
    value: currency,
    label: `${currency} (${formatNumber(headcount)} ${headcount === 1 ? "employee" : "employees"})`,
  }));
  // Keep a currency from the URL selectable even when nobody active is paid in it.
  if (current && !options.some((option) => option.value === current)) {
    options.push({ value: current, label: current });
  }
  return options;
}

function LoadingNotice({ children }: { children: string }) {
  return (
    <div role="status" className="surface-card flex items-center gap-3 p-6 text-sm text-muted-foreground">
      <span aria-hidden="true" className="border-primary/25 border-t-primary size-4 animate-spin rounded-full border-2" />
      {children}
    </div>
  );
}

function ErrorNotice({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="surface-card flex flex-col items-start gap-4 border-destructive/25 bg-destructive/5 p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-full text-lg">!</span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-muted-foreground mt-1 text-sm">{message}</p>
        </div>
      </div>
      <Button variant="outline" onClick={onRetry}>Try again</Button>
    </div>
  );
}

export function InsightsDashboard() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currencies = useApiResource("currencies", (signal) => fetchCurrencies(signal));
  // The URL decides the currency. Without one, start with the largest group.
  const currency = parseCurrency(searchParams.get("currency")) ?? currencies.data?.[0]?.currency ?? null;

  // Both are keyed by currency, so one currency's figures never appear under another.
  const insights = useApiResource(currency, (signal) => fetchInsights(currency!, signal));
  const distribution = useApiResource(currency, (signal) => fetchDistribution(currency!, signal));

  if (currencies.error) {
    return <ErrorNotice title="Could not load the currencies" message={currencies.error.message} onRetry={currencies.retry} />;
  }
  if (currencies.isLoading || !currencies.data) return <LoadingNotice>Loading insights…</LoadingNotice>;
  if (currencies.data.length === 0 && !currency) {
    return (
      <div className="surface-card flex flex-col items-center gap-3 border-dashed p-14 text-center">
        <span aria-hidden="true" className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full text-xl">✦</span>
        <p className="font-semibold">No employees yet</p>
        <p className="text-muted-foreground text-sm">Insights appear once employees have been added.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Choose a currency</p>
          <p className="text-muted-foreground text-xs">Review compensation without converting currencies.</p>
        </div>
        <NativeSelect
          label="Currency"
          value={currency ?? ""}
          options={currencyOptions(currencies.data, currency)}
          onChange={(next) => router.push(`${pathname}?currency=${next}`, { scroll: false })}
          className="w-full sm:max-w-xs"
        />
      </div>
      {currency && (
        <p role="note" className="border-primary/20 bg-primary/5 text-primary flex items-start gap-2 rounded-lg border p-3 text-sm">
          <span aria-hidden="true" className="mt-0.5 font-semibold">ⓘ</span>
          <span>{`These figures are for active employees paid in ${currency}. Amounts in different currencies are never combined or converted.`}</span>
        </p>
      )}

      {insights.error ? (
        <ErrorNotice title="Could not load the insights" message={insights.error.message} onRetry={insights.retry} />
      ) : insights.isLoading || !insights.data ? (
        <LoadingNotice>Loading insights…</LoadingNotice>
      ) : insights.data.overall === null ? (
        <p className="surface-card border-dashed p-14 text-center">{`No active employees are paid in ${insights.data.currency}.`}</p>
      ) : (
        <>
          <Summary stats={insights.data.overall} currency={insights.data.currency} />

          {distribution.error ? (
            <ErrorNotice title="Could not load the chart" message={distribution.error.message} onRetry={distribution.retry} />
          ) : distribution.isLoading || !distribution.data ? (
            <LoadingNotice>Loading chart…</LoadingNotice>
          ) : (
            <DistributionChart buckets={distribution.data.buckets} currency={distribution.data.currency} />
          )}

          <StatsTable title="Salary by country" groupLabel="Country" groups={insights.data.byCountry} currency={insights.data.currency} />
          <StatsTable title="Salary by job title" groupLabel="Job title" groups={insights.data.byJobTitle} currency={insights.data.currency} />
        </>
      )}
    </div>
  );
}
