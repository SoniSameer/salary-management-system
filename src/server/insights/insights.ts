/**
 * Salary statistics for one currency. Every figure is in that currency's whole
 * units. Statistics are never calculated across currencies.
 */
export interface SalaryStats {
  headcount: number;
  min: number;
  average: number;
  median: number;
  max: number;
}

/** Statistics for one country or one job title. */
export interface GroupStats extends SalaryStats {
  name: string;
}

export interface InsightsResult {
  currency: string;
  /** Null when no active employee is paid in this currency. */
  overall: SalaryStats | null;
  /** Largest group first, then by name. */
  byCountry: GroupStats[];
  byJobTitle: GroupStats[];
}

/** A half-open salary range: `from` is included, `to` is not. */
export interface DistributionBucket {
  from: number;
  to: number;
  count: number;
}

export interface DistributionResult {
  currency: string;
  buckets: DistributionBucket[];
}

export interface CurrencyHeadcount {
  currency: string;
  /** Active employees paid in this currency. */
  headcount: number;
}
