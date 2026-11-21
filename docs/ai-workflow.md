# AI Workflow

How AI was used to build this project, and where the human decisions were made.

## Tooling

- **Kiro** (agentic IDE) with Claude Sonnet 5.5.
- Project rules live in [`AGENTS.md`](../AGENTS.md) and `.kiro/steering/`. They cover stack, layering, scope limits and the rule that tests must actually be run before claiming they pass.

## Process

1. **Requirements first.** I read the assessment with the AI, then answered questions about timeline, stack and scope before any code. Output: [`requirements.md`](requirements.md).
2. **Plan before code.** The AI proposed a 13-task plan. I reviewed it and changed it (for example: deactivation instead of delete, no video task).
3. **One task at a time.** Each task starts with a failing test, then the implementation, then a commit.
4. **Verify, do not trust.** After each task the test, typecheck and lint commands are run and the real output is read.

## Decisions I made (not the AI)

| Decision | Reason |
|---|---|
| Deactivate instead of delete | Preserve salary history |
| No currency conversion | Avoid misleading numbers |
| No authentication | Out of brief, documented as a deliberate omission |
| Postgres on Neon with Prisma | Free hosting and a relational model fit the data |

## Corrections made to AI output

Notes are added here as the project progresses.

- Task 10: Prisma has no median, so the statistics are three small raw SQL queries (`percentile_cont(0.5)`), kept in one file. The same contract tests run against an in-memory implementation and against PostgreSQL, with a dataset small enough to check by hand (for example euro Germany: 50k, 60k, 90k gives average 66,667 and median 60,000).
- Task 10: I broke the rounding on purpose and confirmed that exactly 4 service tests fail, then restored it. This checks that a test passing the first time is testing something. A first test run had raced the file write, so it could not show the tests failing.
- Task 10: The production build logged "Unhandled API error: Route needs to bail out of prerendering". My shared error handler was catching Next.js's own control-flow signal (a route that reads `request.url` is dynamic) and treating it as a failure. Users were not affected, because the routes were correctly dynamic, but the same bug would have turned `notFound()` and redirects into 500s. I fixed it once in `toErrorResponse` with `unstable_rethrow`, after writing a failing test, and the build log is now clean.
- Task 10: I cross-checked the live API against an independent JavaScript calculation from the same deterministic seed: 35 comparisons over 7 currencies on the real 10,000 rows. The first run showed 5 mismatches, all INR. They were not a bug. I traced them to one employee I had not seeded (added through the app: India, Software Engineer, 2,700,000 INR). After accounting for that employee the result was 0 mismatches. I verified this by querying the creation timestamps and did not assume it.
- Task 10: Warm response times against the remote database are about 260 ms for currencies and statistics, and about 530 ms for the histogram, which needs two dependent queries. The network round trip to Neon dominates the SQL.
- Task 9: Salary history deltas are computed only between two records in the same currency. A unit test pins this: if two adjacent records had different currencies, no change is shown, because amounts in different currencies are never subtracted or compared. The sign is part of the text (`+€8,000 (+11.4%)`), not only a colour.
- Task 9: After a salary change the API already returns the updated employee and the new record, so the page updates in place and the details are fetched once. A test asserts the single fetch. I considered refetching after each change, but it would flash the whole page into a loading state.
- Task 9: Typecheck caught a typing error in my own test helper (a parameter type inferred from its default value). My command chain committed before reading the failure, so I fixed it in a follow-up commit. Checks now run and are read before any commit step.
- Task 9: The real-browser check created an employee with a raise and a cut on the same day. The cut correctly appears above the raise, which confirms that the history ordering tiebreak (creation time after effective date) works on real PostgreSQL.
- Task 8: I did not add `react-hook-form`. The form has eight fields, so plain state plus the server's own Zod schemas is enough, and the form and the API cannot disagree about what is valid. The schemas now carry plain-language messages ("Enter a valid email address") instead of Zod's defaults, which also improves the API's error responses.
- Task 8: A test run against code I had just edited in the same step reported stale results twice. I now write files, then run checks as a separate step. When a result looks too good, I rerun it.
- Task 8: Real-browser checks run against the TEST database through `scripts/serve-test-db.ps1`, so creating sample employees never adds rows to the demo data. A one-time 3 minute tool timeout could not be reproduced (typecheck 6s, lint 10s, tests 3s) and was treated as a tool stall.
- Task 8: The deactivate dialog states that deactivation cannot be undone in this version. Reactivation is not in the requirements, so I did not build it. It is listed as a possible follow-up.
- Task 8: Components that are only reachable by a mouse click (the dialog's trigger and focus handling) are covered by React Testing Library tests with real keyboard events (Escape, Enter), not by a screenshot.
- Task 7: I wrote a Server Component page that rendered a client table with click handlers as its loading placeholder. Functions cannot cross from server to client, so I caught this in review before running it and replaced it with a handler-free `DirectoryFallback` built from the same column definitions.
- Task 7: A component test found a real UI bug: with filters hiding everyone, two buttons both named "Clear filters" appeared (filter bar and empty state). I renamed the empty-state action to "Show all employees".
- Task 7: Unit tests with mocks could not show a visual problem. A headless Edge screenshot of the production build showed text rendered in a serif font. The shadcn setup had written `--font-sans: var(--font-sans)`, a variable that points at itself. I pointed it at `--font-geist-sans` and re-checked with another screenshot.
- Task 7: The shadcn CLI installed an npm package named `cn` (from the shadcn-ui GitHub organisation, MIT, no dependencies) as a replacement for clsx plus tailwind-merge. I checked its metadata before relying on it.
- Task 7: I started the production server in the same step as the rebuild, so it launched before `.next` existed. Dependent steps now run one after another.
- Task 6: Next.js is configured with Cache Components, which can prerender a `GET` handler that reads no request data. I read the bundled docs first and confirmed that a handler which queries the database stays dynamic, then verified it with `npm run build`: every API route is marked `ƒ` (dynamic).
- Task 6: The shared contract caught a bug the in-memory fake could not show. Prisma's `contains` passes `%` and `_` straight into the SQL `ILIKE` pattern, so searching for `%` matched every employee. Fixed with an `escapeLikePattern` helper that is unit tested, and confirmed on the real 10,000 employee database (search for `%` returns 0).
- Task 6: The first request after Neon suspended the idle database returned 500 (`P2028: Unable to start a transaction in the given time`). Batch transactions take no per-call timeout, so I set `transactionOptions` once on the Prisma client instead. I verified the fix by letting the database idle for 6 minutes and sending a cold request: 200 in 4.2s, which is longer than the old 2s limit.
- Task 6: A full integration run failed with 28 `deadlock detected` errors. Cause: an earlier run had been interrupted, and two suites were truncating the same test database at once. The integration suite is not safe to run twice in parallel. Rerun alone: 52 of 52 passed.
- Task 5: The concurrency test failed first with "Unable to start a transaction in the given time". Prisma's default 2 second wait to start a transaction is too short for a remote serverless database that may be waking up. I set explicit `maxWait` and `timeout` values in the repository instead of loosening the test, because a real user could hit the same delay.
- Task 5: Typecheck caught a type problem that the tests did not: Zod's `.transform()` made `reason` a required key. I declared `ChangeSalaryInput` by hand with `reason` optional.
- Task 5: Salary changes use an optimistic concurrency guard. The service reads the employee, and the repository writes only if the salary and active status are unchanged (a conditional `UPDATE ... WHERE`). Two simultaneous changes cannot both succeed, and nothing is overwritten silently. A test proves exactly one of two parallel changes wins.
- Task 4: One repository contract (`employee-repository.contract.ts`) runs against both the in-memory fake and the Prisma repository, so the fake cannot drift from real database behavior. Duplicate emails are caught from the database unique constraint instead of check-then-insert, which avoids a race between two requests.
- Task 4: A first test run passed in the same step that created the file under test. I could not trust which version it ran, so I reran it afterwards. Dependent steps now run one after another.
- Task 4: I did not smoke-test the live server with a successful create, because the dev server uses the main database and would have added a stray employee to the demo data. The same flow is covered by integration tests against the test database instead.
- Task 2: `npm install prisma` resolved to a release candidate (8.0.0-rc.34) while the client was 7.10.1. Pinned both to the stable 7.10.1. Prisma 7 removed `directUrl`, so the plan changed: migrations read `DIRECT_URL` (via `prisma.config.ts`) and the app reads the pooled `DATABASE_URL` (via a driver adapter).
- Task 2: The integration test runner refuses to run unless `TEST_DATABASE_URL` differs from the app database, because the tests truncate tables.
- Task 1: The test tooling install failed on a `@types/node` conflict. Fixed by aligning `@types/node` with Node 22. Removed `vite-tsconfig-paths` because Vite supports tsconfig paths natively.

## Key prompts

- Planning: "Go through the assessment document and guide me on the best way to build it", followed by scoped clarifying questions.
- Rules: the engineering instructions in `AGENTS.md`, supplied up front so every task follows the same standards.
