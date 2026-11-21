// One fixed locale, so the same value reads the same for every user and in tests.
const LOCALE = "en-US";

const numberFormat = new Intl.NumberFormat(LOCALE);

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/**
 * Formats a whole-unit salary in its own currency, for example "€70,000".
 * Salaries are never converted between currencies. If the currency code is not
 * one Intl knows, the code and amount are shown instead of throwing.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${formatNumber(amount)}`;
  }
}

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  // Dates are stored as midnight UTC. Without this a date can show as the day before.
  timeZone: "UTC",
});

export function formatDate(value: string | null): string {
  if (!value) return "–";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : dateFormat.format(date);
}
