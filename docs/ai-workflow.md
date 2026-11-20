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

- Task 1: The test tooling install failed on a `@types/node` conflict. Fixed by aligning `@types/node` with Node 22. Removed `vite-tsconfig-paths` because Vite supports tsconfig paths natively.

## Key prompts

- Planning: "Go through the assessment document and guide me on the best way to build it", followed by scoped clarifying questions.
- Rules: the engineering instructions in `AGENTS.md`, supplied up front so every task follows the same standards.
