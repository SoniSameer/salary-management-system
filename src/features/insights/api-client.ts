import { request } from "@/lib/api-request";
import type {
  CurrencyHeadcount,
  DistributionResult,
  InsightsResult,
} from "@/server/insights/insights";

// The API's JSON has no dates, so these server types are exactly what arrives over HTTP.
export type { CurrencyHeadcount, DistributionResult, GroupStats, InsightsResult, SalaryStats } from "@/server/insights/insights";

export async function fetchCurrencies(signal?: AbortSignal): Promise<CurrencyHeadcount[]> {
  const { currencies } = await request<{ currencies: CurrencyHeadcount[] }>("/api/insights/currencies", { signal });
  return currencies;
}

export function fetchInsights(currency: string, signal?: AbortSignal): Promise<InsightsResult> {
  return request<InsightsResult>(`/api/insights?currency=${encodeURIComponent(currency)}`, { signal });
}

export function fetchDistribution(currency: string, signal?: AbortSignal): Promise<DistributionResult> {
  return request<DistributionResult>(`/api/insights/distribution?currency=${encodeURIComponent(currency)}`, { signal });
}
