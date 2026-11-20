# Requirements: Salary Management System

## Goal

ACME's HR team manages salary data for 10,000 employees in several countries through Excel files. This is slow and error prone, and it is hard to answer simple questions such as "what do we pay engineers in Germany?". The goal is a web app where the HR Manager can maintain salary data and see how the organization pays its people.

**User:** one HR Manager. **Scale:** 10,000 employees, several countries and currencies.

## Scope and features

1. **Employee directory.** Search by name or email. Filter by country, department, job title and currency. Sort and paginate on the server so the page stays fast with 10,000 rows.
2. **Add and edit employees.** Validated input, unique email.
3. **Deactivate employees.** No hard delete, so history is never lost. Deactivated employees stay visible when filtered and are left out of analytics.
4. **Salary changes with history.** Each change records amount, currency, effective date and reason in an append-only history. The employee page shows the full history.
5. **Insights dashboard.** HR picks a currency. The app shows headcount and minimum, average, median and maximum salary by country and by job title, plus a salary distribution chart.
6. **Seed data.** A deterministic script creates 10,000 synthetic employees across about 8 countries.

## Key decisions

- **Currencies are never mixed.** Averaging EUR with JPY gives a meaningless number. The currency selector filters the data. It does not convert it. Conversion needs exchange rates, which change and need a source of truth.
- **Salary is the annual amount in whole currency units.** This keeps the maths exact and simple.
- **Current salary is stored on the employee as well as in history.** Directory sorting, filtering and analytics stay fast. The history table is the audit trail.

## Deliberately left out, and why

| Left out | Reason |
|---|---|
| Login and roles | The brief names one persona. It would cost time without showing salary-management judgement. The deployment is a **demo with synthetic data only** and is **not suitable for real salary data** until authentication, authorization and audit logging are added. |
| Currency conversion | Needs exchange-rate data and a policy for which rate to use. Filtering by currency answers the question honestly. |
| Bulk Excel or CSV import | The seed script covers the 10,000 employee requirement. A real migration needs mapping and error reporting, which is its own project. |
| Payroll, tax, attendance, leave | A different problem from "how do we pay people". |
| Employee self-service | The only user is HR. |
| Microservices | One small app is simpler to build, test and run. |

## Success criteria

- HR can find any employee in a few seconds and change a salary with a visible history.
- Insights match a hand calculation on test data, and never combine currencies.
- The directory and dashboard respond quickly with 10,000 employees.
- Business rules are covered by fast, deterministic tests, plus integration tests on real PostgreSQL.
