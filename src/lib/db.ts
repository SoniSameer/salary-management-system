import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma waits 2s to start a transaction by default. A serverless database
// that has been idle (Neon suspends free databases) can take longer to wake,
// which showed up as P2028 on the first request. Allow more time everywhere.
export const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const;

export function createPrismaClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, transactionOptions: { ...TRANSACTION_OPTIONS } });
}

// In development Next.js reloads modules, so keep one client on globalThis to
// avoid opening a new connection pool on every reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForPrisma.prisma = createPrismaClient(connectionString);
  }
  return globalForPrisma.prisma;
}
