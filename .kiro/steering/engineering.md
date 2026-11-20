---
inclusion: always
---

# Engineering rules

Follow the engineering instructions in #[[file:AGENTS.md]].

Reminders for every task:

- Write a failing test first, then the implementation. Run it and read the real output.
- Keep route handlers thin. Business rules live in services. Services depend on repository interfaces.
- Never aggregate salaries across currencies.
- Next.js here has breaking changes. Check `node_modules/next/dist/docs/` before using a Next.js API.
