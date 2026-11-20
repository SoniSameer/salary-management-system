<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Engineering Instructions

## Project

Full-stack Salary Management System for an organization with 10,000 employees across multiple countries. Persona: HR Manager. Demo only, synthetic data, no authentication.

## Technology

Next.js (App Router), React, TypeScript (strict), PostgreSQL (Neon), Prisma, Tailwind CSS, shadcn/ui, Recharts, Zod, Vitest, React Testing Library.

## Engineering Principles

1. Prefer simple, maintainable solutions.
2. Use strict TypeScript. Avoid `any`.
3. Keep business logic separate from UI components.
4. Keep API route handlers thin: parse, call a service, map errors to HTTP status codes.
5. Validate all incoming API data with Zod.
6. Use Prisma transactions for salary updates.
7. Preserve salary history. Employees are deactivated, never deleted.
8. Never combine different currencies in financial analytics. No currency conversion.
9. Implement database-level pagination, filtering and sorting.
10. Use appropriate database indexes.
11. Handle loading, error and empty states.
12. Write meaningful tests for business-critical logic.
13. Follow accessibility best practices.
14. Never commit secrets or credentials. Only `.env.example` is committed.

## Layering

`route handler -> service -> repository interface -> Prisma repository (prod) | in-memory fake (unit tests)`

## AI Collaboration Rules

- Analyze requirements before implementation and identify edge cases before coding.
- Explain significant architectural decisions.
- Implement one feature at a time, test first, then implementation.
- Run the relevant tests after each implementation. Never claim tests pass without running them.
- Review generated code instead of blindly accepting it.
- Do not introduce unnecessary dependencies.
- Do not overwrite existing work without reviewing it.
- Make small conventional commits (`feat:`, `test:`, `docs:`, `chore:`, `refactor:`).

## Scope Restrictions

Do not implement: payroll processing, tax calculations, attendance, leave, employee self-service, live currency conversion, login and roles, bulk import, microservices.
