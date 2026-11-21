import type { CurrencyHeadcount, GroupStats, SalaryStats } from "./insights";

/** Statistics straight from the store. Average and median are not yet rounded. */
export interface RawInsights {
  overall: SalaryStats | null;
  byCountry: GroupStats[];
  byJobTitle: GroupStats[];
}

/**
 * Read-only storage port for salary analytics. Every method looks at ACTIVE
 * employees in ONE currency, so amounts in different currencies are never
 * combined. Implemented by Prisma in production and by an in-memory fake in
 * unit tests, and both must pass the same contract tests.
 */
export interface InsightsRepository {
  /** Currencies with at least one active employee, largest first, then by code. */
  getCurrencies(): Promise<CurrencyHeadcount[]>;

  /** Statistics overall, by country and by job title. Largest group first, then by name. */
  getStats(currency: string): Promise<RawInsights>;

  /** Lowest and highest current salary, or null when there are no active employees. */
  getSalaryRange(currency: string): Promise<{ min: number; max: number } | null>;

  /**
   * Counts employees in each half-open range [edges[i], edges[i + 1]).
   * @returns one count per range, so `edges.length - 1` numbers.
   *          A salary outside every range is not counted.
   */
  countByEdges(currency: string, edges: number[]): Promise<number[]>;
}
