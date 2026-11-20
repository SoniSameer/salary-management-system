import type { PrismaClient } from "@/generated/prisma/client";
import { generateEmployees } from "./generate-employees";

export interface SeedOptions {
  count: number;
  seed: number;
  /** Wipe existing employees and salary history before seeding. */
  reset?: boolean;
}

export interface SeedResult {
  skipped: boolean;
  employees: number;
  salaryRecords: number;
}

// Keeps each INSERT well under PostgreSQL's bind parameter limit.
const BATCH_SIZE = 1_000;
// A bulk insert over the network can exceed Prisma's 5 second default.
const TRANSACTION_TIMEOUT_MS = 120_000;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Fills the database with synthetic employees. Safe to run twice: it does
 * nothing if employees already exist, unless `reset` is set. The whole run is
 * one transaction, so a failure leaves the database as it was.
 */
export async function seedDatabase(
  prisma: PrismaClient,
  { count, seed, reset = false }: SeedOptions,
): Promise<SeedResult> {
  if (!reset && (await prisma.employee.count()) > 0) {
    return { skipped: true, employees: 0, salaryRecords: 0 };
  }

  const generated = generateEmployees(count, seed);
  const salaryRecords = generated.flatMap((employee) =>
    employee.salaryHistory.map((record) => ({
      employeeId: employee.id,
      amount: record.amount,
      currency: record.currency,
      effectiveAt: record.effectiveAt,
      reason: record.reason,
    })),
  );

  await prisma.$transaction(
    async (tx) => {
      if (reset) {
        await tx.salaryRecord.deleteMany();
        await tx.employee.deleteMany();
      }

      for (const batch of chunk(generated, BATCH_SIZE)) {
        await tx.employee.createMany({
          data: batch.map((employee) => ({
            id: employee.id,
            fullName: employee.fullName,
            email: employee.email,
            country: employee.country,
            department: employee.department,
            jobTitle: employee.jobTitle,
            currency: employee.currency,
            currentSalary: employee.currentSalary,
            isActive: employee.isActive,
            hiredAt: employee.hiredAt,
            deactivatedAt: employee.deactivatedAt,
          })),
        });
      }
      for (const batch of chunk(salaryRecords, BATCH_SIZE)) {
        await tx.salaryRecord.createMany({ data: batch });
      }
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );

  return { skipped: false, employees: generated.length, salaryRecords: salaryRecords.length };
}
