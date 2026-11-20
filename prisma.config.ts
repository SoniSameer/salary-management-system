import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// The Prisma CLI (migrate, db push) uses the DIRECT, non-pooled Neon URL.
// The running app uses the pooled DATABASE_URL through a driver adapter
// (see src/lib/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
