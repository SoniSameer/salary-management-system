import { formatMoney } from "@/lib/format";
import type { SalaryRecordDto } from "./api-client";

export interface SalaryChange {
  /** New salary minus the previous one, in the employee's currency. */
  amount: number;
  /** Change as a percentage of the previous salary, to one decimal place. */
  percent: number;
}

export interface HistoryRow {
  id: string;
  effectiveAt: string;
  amount: number;
  currency: string;
  reason: string | null;
  /** Null for the first record, or when the previous record is in another currency. */
  change: SalaryChange | null;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Adds "what changed" to each record. The list is newest first, so each record
 * is compared with the one after it. A change is only calculated between two
 * records in the same currency: amounts in different currencies are never
 * subtracted or compared.
 */
export function buildHistoryRows(records: SalaryRecordDto[]): HistoryRow[] {
  return records.map((record, index) => {
    const previous = records[index + 1];
    const comparable = previous !== undefined && previous.currency === record.currency && previous.amount > 0;

    return {
      id: record.id,
      effectiveAt: record.effectiveAt,
      amount: record.amount,
      currency: record.currency,
      reason: record.reason,
      change: comparable
        ? {
            amount: record.amount - previous.amount,
            percent: roundToOneDecimal(((record.amount - previous.amount) / previous.amount) * 100),
          }
        : null,
    };
  });
}

/** For example "+€8,000 (+11.4%)". The sign is part of the text, so it does not rely on colour. */
export function formatChange(change: SalaryChange | null, currency: string): string {
  if (!change) return "–";

  const sign = change.amount < 0 ? "-" : "+";
  return `${sign}${formatMoney(Math.abs(change.amount), currency)} (${sign}${Math.abs(change.percent)}%)`;
}
