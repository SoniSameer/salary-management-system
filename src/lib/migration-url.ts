/**
 * The database URL the Prisma CLI uses. Migrations need the DIRECT (non-pooled)
 * Neon connection. Pooled connections can break the locks migrations rely on,
 * so this deliberately does not fall back to DATABASE_URL.
 *
 * It returns an empty string when the variable is missing, instead of throwing.
 * Commands that need no database, such as `prisma generate` during `npm install`
 * on a build server, must still work. A command that does need a database,
 * such as `prisma migrate deploy`, fails with Prisma's own "URL is empty" error.
 */
export function migrationDatabaseUrl(environment: Record<string, string | undefined>): string {
  return environment.DIRECT_URL?.trim() ?? "";
}
