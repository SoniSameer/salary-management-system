import { buildBucketEdges } from "./buckets";
import type {
  CurrencyHeadcount,
  DistributionResult,
  GroupStats,
  InsightsResult,
  SalaryStats,
} from "./insights";
import type { InsightsRepository } from "./insights-repository";

/** Salaries are whole currency units, so averages and medians are shown the same way. */
function rounded<T extends SalaryStats>(stats: T): T {
  return { ...stats, average: Math.round(stats.average), median: Math.round(stats.median) };
}

/**
 * Answers "how do we pay people?" for one currency at a time. Every method
 * takes a currency, and the repository only ever looks at employees paid in
 * it, so amounts in different currencies are never added, averaged or compared.
 */
export class InsightsService {
  constructor(private readonly insights: InsightsRepository) {}

  /** Currencies that have active employees, for the currency selector. */
  getCurrencies(): Promise<CurrencyHeadcount[]> {
    return this.insights.getCurrencies();
  }

  async getInsights(currency: string): Promise<InsightsResult> {
    const raw = await this.insights.getStats(currency);

    return {
      currency,
      overall: raw.overall ? rounded(raw.overall) : null,
      byCountry: raw.byCountry.map((group): GroupStats => rounded(group)),
      byJobTitle: raw.byJobTitle.map((group): GroupStats => rounded(group)),
    };
  }

  async getDistribution(currency: string): Promise<DistributionResult> {
    const range = await this.insights.getSalaryRange(currency);
    if (!range) return { currency, buckets: [] };

    const edges = buildBucketEdges(range.min, range.max);
    // If someone is hired above `range.max` between these two calls, they fall
    // outside the edges and are left out of this chart. The next load includes them.
    const counts = await this.insights.countByEdges(currency, edges);

    return {
      currency,
      buckets: counts.map((count, index) => ({ from: edges[index], to: edges[index + 1], count })),
    };
  }
}
