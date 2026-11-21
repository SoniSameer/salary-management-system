# Trade-offs and deliberate omissions

## Current salary on Employee plus SalaryRecord history

The latest salary is duplicated on `Employee` and stored in `SalaryRecord`. This makes the directory’s salary sort, filters and analytics simple and database-friendly. The cost is a consistency obligation. Every write that changes salary must update both tables in one transaction, and the service never allows profile edits to change salary. Salary history remains append-only.

## Integer salary amounts

Annual salaries are stored as whole currency units in PostgreSQL `integer` columns. This avoids Decimal serialization issues and matches the assessment’s analytics needs. A production payroll system may need minor units or a dedicated money type for cents, bonuses and more complex compensation.

## No currency conversion

The app never adds or averages EUR, USD, INR or another currency together. Conversion requires exchange-rate sources, effective-date policy and auditability. Filtering analytics by currency answers the question without presenting false precision.

## No authentication or authorization

The brief has one persona and the two-day MVP prioritizes salary workflows. The deployed app is a synthetic-data demo and visibly says that it has no login. A production system must add authentication, authorization, audit logs and security review before handling real salary information.

## Deactivation instead of deletion

Employees are never hard-deleted. Deactivation removes them from active directory results and analytics while retaining the employee and salary history. Reactivation is not included in this assessment version.

## Offset pagination

The directory uses database `skip`/`take` pagination because it is easy to explain, supports arbitrary sorting and is adequate for 10,000 employees. Cursor pagination would behave better for very large, constantly changing datasets, but it would complicate arbitrary sort columns and URL navigation.

## ILIKE-style contains search

Case-insensitive contains search is simple and adequate for 10,000 rows. User wildcard characters are escaped. If the directory grows substantially, PostgreSQL `pg_trgm` indexes or a search service would improve substring performance.

## No bulk Excel import

The assessment asks for seeded data, not a migration workflow. Bulk import needs column mapping, previews, row-level errors, duplicate policy and rollback behavior. It is a separate feature rather than a half-built upload button.

## Recharts instead of a custom SVG chart

Recharts delivers a readable, responsive chart quickly and works with React. The chart is paired with a text summary and a data table because a visual alone is not an accessible analytics answer.

## One Next.js application instead of microservices

The system is a small assessment product. Route handlers, services, repositories and one PostgreSQL database keep deployment and debugging simple. Microservices would add operational cost without improving this user journey.
