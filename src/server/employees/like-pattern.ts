/**
 * Escapes the characters that have special meaning inside a SQL LIKE/ILIKE
 * pattern, so user input is matched literally. Prisma's `contains` passes the
 * text straight into the pattern, so without this a search for "%" would match
 * every row and "_" would match any single character.
 *
 * Backslash is PostgreSQL's default escape character, and must be escaped first.
 */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}
