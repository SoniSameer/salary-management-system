import "dotenv/config";
import { createPrismaClient } from "../src/lib/db";
import { seedDatabase } from "../src/seed/seed-database";

// Usage: npm run db:seed            (skips if employees already exist)
//        npm run db:seed -- --reset (wipes and reseeds)
const EMPLOYEE_COUNT = 10_000;
const SEED = 20261120;

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = createPrismaClient(connectionString);
  try {
    const started = Date.now();
    const result = await seedDatabase(prisma, {
      count: EMPLOYEE_COUNT,
      seed: SEED,
      reset: process.argv.includes("--reset"),
    });

    if (result.skipped) {
      console.log("Employees already exist. Nothing seeded. Use --reset to replace them.");
      return;
    }

    console.log(
      `Seeded ${result.employees} employees and ${result.salaryRecords} salary records in ${(
        (Date.now() - started) / 1000
      ).toFixed(1)}s.`,
    );

    const byCountry = await prisma.employee.groupBy({
      by: ["country", "currency"],
      _count: { _all: true },
      orderBy: { country: "asc" },
    });
    for (const row of byCountry) {
      console.log(`  ${row.country} (${row.currency}): ${row._count._all}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
