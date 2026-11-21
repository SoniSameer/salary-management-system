/**
 * Cross-checks the insights API against figures computed independently in
 * plain JavaScript from the same deterministic seed. It reads only: run it
 * against a server that uses the SEEDED demo database.
 *
 * Usage: npx tsx scripts/verify-insights.ts http://localhost:3100
 */
import { generateEmployees } from "../src/seed/generate-employees";

// Must match prisma/seed.ts.
const EMPLOYEE_COUNT = 10_000;
const SEED = 20261120;

// Usage: tsx scripts/verify-insights.ts <baseUrl> [--extra "country|jobTitle|currency|salary"]...
// Each --extra adds one ACTIVE employee that was created after the seed, so the
// expected figures account for people added through the app.
const args = process.argv.slice(2);
const baseUrl = args.find((arg) => arg.startsWith("http")) ?? "http://localhost:3100";
const extras = args.flatMap((arg, index) => {
  if (args[index - 1] !== "--extra") return [];
  const [country, jobTitle, currency, salary] = arg.split("|");
  return [{ country, jobTitle, currency, currentSalary: Number(salary) }];
});

interface Stats {
  headcount: number;
  min: number;
  average: number;
  median: number;
  max: number;
}
interface Group extends Stats {
  name: string;
}
interface InsightsResponse {
  currency: string;
  overall: Stats | null;
  byCountry: Group[];
  byJobTitle: Group[];
}
interface DistributionResponse {
  buckets: { from: number; to: number; count: number }[];
}

function summarise(salaries: number[]): Stats {
  const sorted = [...salaries].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    headcount: sorted.length,
    min: sorted[0],
    average: Math.round(mean),
    median: Math.round(median),
    max: sorted[sorted.length - 1],
  };
}

function groupStats(people: { name: string; salary: number }[]): Group[] {
  const groups = new Map<string, number[]>();
  for (const person of people) groups.set(person.name, [...(groups.get(person.name) ?? []), person.salary]);
  return [...groups.entries()]
    .map(([name, salaries]) => ({ name, ...summarise(salaries) }))
    .sort((a, b) => b.headcount - a.headcount || (a.name < b.name ? -1 : 1));
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return (await response.json()) as T;
}

let mismatches = 0;
function check(label: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    mismatches += 1;
    console.log(`MISMATCH ${label}\n  api:      ${JSON.stringify(actual)}\n  expected: ${JSON.stringify(expected)}`);
  }
}

async function main(): Promise<void> {
  const seeded = generateEmployees(EMPLOYEE_COUNT, SEED).filter((employee) => employee.isActive);
  const active = [...seeded, ...extras];
  if (extras.length > 0) console.log(`including ${extras.length} extra employee(s) added after the seed\n`);
  const { currencies } = await get<{ currencies: { currency: string; headcount: number }[] }>("/api/insights/currencies");

  let comparisons = 0;
  for (const { currency, headcount } of currencies) {
    const people = active.filter((employee) => employee.currency === currency);
    const api = await get<InsightsResponse>(`/api/insights?currency=${currency}`);
    const distribution = await get<DistributionResponse>(`/api/insights/distribution?currency=${currency}`);

    check(`${currency} headcount in currency list`, headcount, people.length);
    check(`${currency} overall`, api.overall, summarise(people.map((p) => p.currentSalary)));
    check(
      `${currency} by country`,
      api.byCountry,
      groupStats(people.map((p) => ({ name: p.country, salary: p.currentSalary }))),
    );
    check(
      `${currency} by job title`,
      api.byJobTitle,
      groupStats(people.map((p) => ({ name: p.jobTitle, salary: p.currentSalary }))),
    );
    check(
      `${currency} histogram total`,
      distribution.buckets.reduce((sum, bucket) => sum + bucket.count, 0),
      people.length,
    );
    comparisons += 4 + 1;

    const eurNote = currency === "EUR" ? ` (${api.byCountry.map((g) => g.name).join(" + ")})` : "";
    console.log(
      `${currency}: ${people.length} active employees, median ${api.overall?.median}, ${api.byCountry.length} countries, ${api.byJobTitle.length} job titles, ${distribution.buckets.length} buckets${eurNote}`,
    );
  }

  console.log(`\n${comparisons} comparisons across ${currencies.length} currencies, ${mismatches} mismatches`);
  if (mismatches > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
