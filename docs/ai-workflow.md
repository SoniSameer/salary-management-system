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
