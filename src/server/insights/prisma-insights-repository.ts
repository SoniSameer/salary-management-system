import type { PrismaClient } from "@/generated/prisma/client";
import type { CurrencyHeadcount, GroupStats, SalaryStats } from "./insights";
import type { InsightsRepository, RawInsights } from "./insights-repository";

/**
 * Prisma has no median aggregate, so the statistics are plain SQL. Each one
 * covers ACTIVE employees in ONE currency, which is what the indexes on
 * ("isActive", "currency", "country") and ("isActive", "currency", "jobTitle")
 * are for. Result columns are cast so no BigInt or Decimal values reach the app.
 */

interface StatsRow extends SalaryStats {
  name: string;
}

function toGroup(row: StatsRow): GroupStats {
  return {
    name: row.name,
    headcount: row.headcount,
    min: row.min,
    average: row.average,
    median: row.median,
    max: row.max,
  };
}

export class PrismaInsightsRepository implements InsightsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getCurrencies(): Promise<CurrencyHeadcount[]> {
    const rows = await this.prisma.employee.groupBy({
      by: ["currency"],
      where: { isActive: true },
      _count: { _all: true },
    });

    return rows
      .map((row) => ({ currency: row.currency, headcount: row._count._all }))
      .sort((a, b) => b.headcount - a.headcount || a.currency.localeCompare(b.currency));
  }

  async getStats(currency: string): Promise<RawInsights> {
    const [overallRows, byCountry, byJobTitle] = await Promise.all([
      this.prisma.$queryRaw<SalaryStats[]>`
        SELECT COUNT(*)::int AS headcount,
               MIN("currentSalary")::int AS min,
               AVG("currentSalary")::float8 AS average,
               (percentile_cont(0.5) WITHIN GROUP (ORDER BY "currentSalary"))::float8 AS median,
               MAX("currentSalary")::int AS max
        FROM "Employee"
        WHERE "isActive" = true AND "currency" = ${currency}`,
      this.prisma.$queryRaw<StatsRow[]>`
        SELECT "country" AS name,
               COUNT(*)::int AS headcount,
               MIN("currentSalary")::int AS min,
               AVG("currentSalary")::float8 AS average,
               (percentile_cont(0.5) WITHIN GROUP (ORDER BY "currentSalary"))::float8 AS median,
               MAX("currentSalary")::int AS max
        FROM "Employee"
        WHERE "isActive" = true AND "currency" = ${currency}
        GROUP BY "country"
        ORDER BY headcount DESC, name ASC`,
      this.prisma.$queryRaw<StatsRow[]>`
        SELECT "jobTitle" AS name,
               COUNT(*)::int AS headcount,
               MIN("currentSalary")::int AS min,
               AVG("currentSalary")::float8 AS average,
               (percentile_cont(0.5) WITHIN GROUP (ORDER BY "currentSalary"))::float8 AS median,
               MAX("currentSalary")::int AS max
        FROM "Employee"
        WHERE "isActive" = true AND "currency" = ${currency}
        GROUP BY "jobTitle"
        ORDER BY headcount DESC, name ASC`,
    ]);

    // An aggregate with no GROUP BY always returns one row, with a count of 0 when nobody matched.
    const overall = overallRows[0];
    if (!overall || overall.headcount === 0) return { overall: null, byCountry: [], byJobTitle: [] };

    return {
      overall: {
        headcount: overall.headcount,
        min: overall.min,
        average: overall.average,
        median: overall.median,
        max: overall.max,
      },
      byCountry: byCountry.map(toGroup),
      byJobTitle: byJobTitle.map(toGroup),
    };
  }

  async getSalaryRange(currency: string): Promise<{ min: number; max: number } | null> {
    const { _min, _max } = await this.prisma.employee.aggregate({
      where: { isActive: true, currency },
      _min: { currentSalary: true },
      _max: { currentSalary: true },
    });

    return _min.currentSalary === null || _max.currentSalary === null
      ? null
      : { min: _min.currentSalary, max: _max.currentSalary };
  }

  async countByEdges(currency: string, edges: number[]): Promise<number[]> {
    const bucketCount = edges.length - 1;
    if (bucketCount < 1) return [];

    // width_bucket returns 1..n for a salary inside a range, 0 below the first edge
    // and n + 1 at or above the last edge. Those two are outside every range.
    const rows = await this.prisma.$queryRaw<{ bucket: number; count: number }[]>`
      SELECT width_bucket("currentSalary", ${edges}::int[]) AS bucket,
             COUNT(*)::int AS count
      FROM "Employee"
      WHERE "isActive" = true AND "currency" = ${currency}
      GROUP BY bucket`;

    const counts = new Array<number>(bucketCount).fill(0);
    for (const row of rows) {
      if (row.bucket >= 1 && row.bucket <= bucketCount) counts[row.bucket - 1] = row.count;
    }
    return counts;
  }
}
