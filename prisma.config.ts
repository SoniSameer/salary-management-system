import "dotenv/config";
import { defineConfig } from "prisma/config";
import { migrationDatabaseUrl } from "./src/lib/migration-url";

// The Prisma CLI (migrate, db push) uses the DIRECT, non-pooled Neon URL.
// The running app uses the pooled DATABASE_URL through a driver adapter
// (see src/lib/db.ts).
//
// The URL is read without Prisma's env() helper on purpose: env() throws when the
// variable is missing, which would make `prisma generate` (run by `npm install`
// on Vercel, where only DATABASE_URL is set) fail. See src/lib/migration-url.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationDatabaseUrl(process.env),
  },
});
