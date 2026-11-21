import type { CurrencyHeadcount, GroupStats, SalaryStats } from "@/server/insights/insights";
import type { InsightsRepository, RawInsights } from "@/server/insights/insights-repository";
import type { SeedEmployee } from "@/server/insights/insights-repository.contract";

function median(sorted: number[]): number {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function summarise(salaries: number[]): SalaryStats {
  const sorted = [...salaries].sort((a, b) => a - b);
  return {
    headcount: sorted.length,
    min: sorted[0],
    average: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    median: median(sorted),
    max: sorted[sorted.length - 1],
  };
}

function groupBy(employees: SeedEmployee[], key: "country" | "jobTitle"): GroupStats[] {
  const groups = new Map<string, number[]>();
  for (const employee of employees) {
    groups.set(employee[key], [...(groups.get(employee[key]) ?? []), employee.salary]);
  }
  return [...groups.entries()]
    .map(([name, salaries]) => ({ name, ...summarise(salaries) }))
    .sort((a, b) => b.headcount - a.headcount || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Test double for InsightsRepository. Kept honest by the shared contract tests. */
export class InMemoryInsightsRepository implements InsightsRepository {
  private employees: SeedEmployee[] = [];

  add(employees: SeedEmployee[]): void {
    this.employees.push(...employees);
  }

  /** Active employees paid in one currency: the only people any figure is based on. */
  private active(currency: string): SeedEmployee[] {
    return this.employees.filter((employee) => employee.active !== false && employee.currency === currency);
  }

  async getCurrencies(): Promise<CurrencyHeadcount[]> {
    const counts = new Map<string, number>();
    for (const employee of this.employees) {
      if (employee.active === false) continue;
      counts.set(employee.currency, (counts.get(employee.currency) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([currency, headcount]) => ({ currency, headcount }))
      .sort((a, b) => b.headcount - a.headcount || (a.currency < b.currency ? -1 : 1));
  }

  async getStats(currency: string): Promise<RawInsights> {
    const people = this.active(currency);
    if (people.length === 0) return { overall: null, byCountry: [], byJobTitle: [] };

    return {
      overall: summarise(people.map((employee) => employee.salary)),
      byCountry: groupBy(people, "country"),
      byJobTitle: groupBy(people, "jobTitle"),
    };
  }

  async getSalaryRange(currency: string): Promise<{ min: number; max: number } | null> {
    const salaries = this.active(currency).map((employee) => employee.salary);
    return salaries.length === 0 ? null : { min: Math.min(...salaries), max: Math.max(...salaries) };
  }

  async countByEdges(currency: string, edges: number[]): Promise<number[]> {
    const salaries = this.active(currency).map((employee) => employee.salary);
    return edges
      .slice(0, -1)
      .map((from, index) => salaries.filter((salary) => salary >= from && salary < edges[index + 1]).length);
  }
}
