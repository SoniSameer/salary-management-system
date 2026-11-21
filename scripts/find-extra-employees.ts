/**
 * Read-only: lists employees created after the seed run, to explain any difference
 * between the database and the deterministic seed. Uses DATABASE_URL from .env.
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/db";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const prisma = createPrismaClient(connectionString);

  try {
    const total = await prisma.employee.count();
    const newest = await prisma.employee.findMany({ orderBy: { createdAt: "desc" }, take: 3 });
    const oldest = await prisma.employee.findFirst({ orderBy: { createdAt: "asc" } });
    const seedTime = oldest?.createdAt.getTime() ?? 0;
    const afterSeed = await prisma.employee.findMany({
      where: { createdAt: { gt: new Date(seedTime + 60_000) } },
      include: { salaryRecords: true },
    });

    console.log(`total employees: ${total}`);
    console.log(`seed ran at about: ${oldest?.createdAt.toISOString()}`);
    console.log(`created more than a minute after the seed: ${afterSeed.length}`);
    for (const e of afterSeed) {
      console.log(
        `  ${e.createdAt.toISOString()}  ${e.fullName} <${e.email}>  ${e.country}  ${e.jobTitle}  ${e.currentSalary} ${e.currency}  active=${e.isActive}  salaryRecords=${e.salaryRecords.length}`,
      );
    }
    console.log(`newest 3 by createdAt: ${newest.map((e) => e.fullName).join(", ")}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
