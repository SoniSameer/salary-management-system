import {
  fakerDE,
  fakerEN_AU,
  fakerEN_GB,
  fakerEN_IN,
  fakerEN_US,
  fakerFR,
  fakerJA,
  fakerPT_BR,
  type Faker,
} from "@faker-js/faker";

/**
 * Pure, deterministic generator of synthetic employees. It does not touch the
 * database, so it is fast to test. The same (count, seed) always gives the
 * same output.
 */

export interface GeneratedSalaryRecord {
  amount: number;
  currency: string;
  effectiveAt: Date;
  reason: string;
}

export interface GeneratedEmployee {
  id: string;
  fullName: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  currency: string;
  currentSalary: number;
  isActive: boolean;
  hiredAt: Date;
  deactivatedAt: Date | null;
  /** Oldest first. The first record is the starting salary on the hire date. */
  salaryHistory: GeneratedSalaryRecord[];
}

interface CountryProfile {
  name: string;
  currency: string;
  /** Share of employees located here (relative weight). */
  weight: number;
  /** Local currency units per 1 unit of the base salary table below. */
  factor: number;
  /** Salaries are rounded to a multiple of this, to look like real pay. */
  roundTo: number;
  faker: Faker;
}

export const COUNTRIES: readonly CountryProfile[] = [
  { name: "United States", currency: "USD", weight: 24, factor: 1.0, roundTo: 500, faker: fakerEN_US },
  { name: "United Kingdom", currency: "GBP", weight: 12, factor: 0.78, roundTo: 500, faker: fakerEN_GB },
  { name: "Germany", currency: "EUR", weight: 12, factor: 0.88, roundTo: 500, faker: fakerDE },
  { name: "France", currency: "EUR", weight: 8, factor: 0.82, roundTo: 500, faker: fakerFR },
  { name: "India", currency: "INR", weight: 18, factor: 26, roundTo: 10_000, faker: fakerEN_IN },
  { name: "Japan", currency: "JPY", weight: 8, factor: 85, roundTo: 10_000, faker: fakerJA },
  { name: "Brazil", currency: "BRL", weight: 8, factor: 2.4, roundTo: 500, faker: fakerPT_BR },
  { name: "Australia", currency: "AUD", weight: 10, factor: 1.35, roundTo: 500, faker: fakerEN_AU },
];

interface JobTitle {
  title: string;
  /** Typical annual base salary before country and seniority adjustments. */
  base: number;
}

const DEPARTMENTS: ReadonlyArray<{
  name: string;
  weight: number;
  titles: readonly JobTitle[];
}> = [
  {
    name: "Engineering",
    weight: 35,
    titles: [
      { title: "Software Engineer", base: 95_000 },
      { title: "Senior Software Engineer", base: 130_000 },
      { title: "Engineering Manager", base: 160_000 },
      { title: "QA Engineer", base: 75_000 },
      { title: "DevOps Engineer", base: 110_000 },
    ],
  },
  {
    name: "Sales",
    weight: 18,
    titles: [
      { title: "Account Executive", base: 80_000 },
      { title: "Sales Manager", base: 110_000 },
    ],
  },
  {
    name: "Operations",
    weight: 16,
    titles: [
      { title: "Operations Analyst", base: 65_000 },
      { title: "Customer Support Specialist", base: 48_000 },
    ],
  },
  {
    name: "Marketing",
    weight: 9,
    titles: [
      { title: "Marketing Specialist", base: 62_000 },
      { title: "Content Strategist", base: 68_000 },
    ],
  },
  {
    name: "Finance",
    weight: 9,
    titles: [
      { title: "Financial Analyst", base: 78_000 },
      { title: "Accountant", base: 66_000 },
    ],
  },
  {
    name: "Product",
    weight: 8,
    titles: [
      { title: "Product Manager", base: 120_000 },
      { title: "Product Designer", base: 90_000 },
    ],
  },
  {
    name: "Human Resources",
    weight: 5,
    titles: [
      { title: "HR Specialist", base: 60_000 },
      { title: "Recruiter", base: 58_000 },
    ],
  },
];

const RAISE_REASONS = ["Annual review", "Promotion", "Market adjustment"] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
// Fixed "today" so output never depends on when the seed runs.
const REFERENCE_DATE = Date.UTC(2026, 10, 1);
const EARLIEST_HIRE = Date.UTC(2015, 0, 1);
const LATEST_HIRE = Date.UTC(2026, 5, 30);
const INACTIVE_PROBABILITY = 0.05;

/** Small seeded PRNG (mulberry32). Same seed gives the same sequence. */
function createRng(seed: number) {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Integer in [min, max], inclusive. */
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    weighted: <T extends { weight: number }>(items: readonly T[]): T => {
      const total = items.reduce((sum, item) => sum + item.weight, 0);
      let target = next() * total;
      for (const item of items) {
        target -= item.weight;
        if (target < 0) return item;
      }
      return items[items.length - 1];
    },
  };
}

type Rng = ReturnType<typeof createRng>;

function uuid(rng: Rng): string {
  const hex = (n: number) =>
    Array.from({ length: n }, () => rng.int(0, 15).toString(16)).join("");
  // Version 4 layout, so the database accepts it as a UUID.
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${rng.pick(["8", "9", "a", "b"])}${hex(3)}-${hex(12)}`;
}

function slug(name: string): string {
  const ascii = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return ascii || "employee";
}

function roundToStep(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function buildSalaryHistory(
  rng: Rng,
  country: CountryProfile,
  title: JobTitle,
  hiredAt: Date,
): GeneratedSalaryRecord[] {
  // Spread pay around the typical figure: roughly -15% to +15%.
  const spread = 0.85 + 0.3 * ((rng.next() + rng.next()) / 2);
  const starting = roundToStep(title.base * country.factor * spread, country.roundTo);

  const history: GeneratedSalaryRecord[] = [
    { amount: starting, currency: country.currency, effectiveAt: hiredAt, reason: "Starting salary" },
  ];

  // 55% no raise, 30% one raise, 15% two raises.
  const roll = rng.next();
  const raiseCount = roll < 0.55 ? 0 : roll < 0.85 ? 1 : 2;

  for (let i = 0; i < raiseCount; i++) {
    const previous = history[history.length - 1];
    const effectiveAt = addDays(previous.effectiveAt, rng.int(180, 400));
    if (effectiveAt.getTime() > REFERENCE_DATE) break;

    const raised = roundToStep(
      previous.amount * (1 + rng.int(3, 12) / 100),
      country.roundTo,
    );
    history.push({
      // Rounding can swallow a small raise, so always add at least one step.
      amount: Math.max(raised, previous.amount + country.roundTo),
      currency: country.currency,
      effectiveAt,
      reason: rng.pick(RAISE_REASONS),
    });
  }

  return history;
}

export function generateEmployees(count: number, seed: number): GeneratedEmployee[] {
  const rng = createRng(seed);

  // Name generation uses Faker locales. Seed each so names are repeatable.
  COUNTRIES.forEach((country, index) => country.faker.seed(seed + index));

  const employees: GeneratedEmployee[] = [];

  for (let index = 0; index < count; index++) {
    const country = rng.weighted(COUNTRIES);
    const department = rng.weighted(DEPARTMENTS);
    const title = rng.pick(department.titles);

    const firstName = country.faker.person.firstName();
    const lastName = country.faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;

    const hiredAt = new Date(
      EARLIEST_HIRE + rng.int(0, Math.floor((LATEST_HIRE - EARLIEST_HIRE) / DAY_MS)) * DAY_MS,
    );
    const salaryHistory = buildSalaryHistory(rng, country, title, hiredAt);
    const lastChange = salaryHistory[salaryHistory.length - 1].effectiveAt;

    // Only deactivate someone who left after their last pay change.
    const daysAvailable = Math.floor((REFERENCE_DATE - lastChange.getTime()) / DAY_MS);
    const isActive = !(daysAvailable >= 1 && rng.next() < INACTIVE_PROBABILITY);
    const deactivatedAt = isActive ? null : addDays(lastChange, rng.int(1, daysAvailable));

    employees.push({
      id: uuid(rng),
      fullName,
      // The running index guarantees unique emails even when names repeat.
      email: `${slug(fullName)}.${index + 1}@acme-demo.example`,
      country: country.name,
      department: department.name,
      jobTitle: title.title,
      currency: country.currency,
      currentSalary: salaryHistory[salaryHistory.length - 1].amount,
      isActive,
      hiredAt,
      deactivatedAt,
      salaryHistory,
    });
  }

  return employees;
}
