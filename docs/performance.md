# Performance considerations

## Dataset and measurements

The demo database contains 10,000 seeded employees and more than 15,000 salary records. Measurements below were taken against the deployed Vercel app and the Neon database on the final read-only smoke check.

| Request | Observed warm response |
|---|---:|
| `GET /api/insights/currencies` | about 260 ms |
| `GET /api/insights?currency=EUR` | about 270 ms |
| `GET /api/insights/distribution?currency=JPY` | about 530 ms |
| Employee list with filters | about 1 second locally against the remote database; deployment smoke request was under 500 ms for the default page |

The first request after Neon’s free database sleeps can be slower because the database wakes up. Prisma’s transaction client has explicit `maxWait` and `timeout` values to avoid failing on the wake-up delay.

## Database work

- Employee list queries use `skip`/`take`, `count`, database filters and a whitelist of sort fields. No endpoint loads all 10,000 employees to filter in JavaScript.
- Indexes cover active status with country/department, currency with country, currency with job title, unique email and employee salary history ordered by effective date.
- Salary analytics groups and calculates statistics in PostgreSQL. Median uses `percentile_cont`; the histogram uses `width_bucket`.
- Salary writes use a single transaction. The conditional salary update checks active status and the expected current salary, which also prevents silent concurrent overwrites.
- Prisma uses Neon’s pooled runtime URL. The Vercel region is set to `iad1`, close to the project’s Neon region. If a deployment uses another Neon region, changing `vercel.json` reduces network latency.

## What was measured and verified

- The deterministic seed creates 10,000 employees and 15,656 salary records in about 19 seconds during local verification. A second seed run skips without changing data.
- The independent insights verification script compared overall, country, job-title and histogram results for all 7 currencies and found zero mismatches after accounting for one employee added manually after seeding.
- A production build with database variables pointed at an unreachable port succeeded and made zero database calls. Two handlers that were initially prerendered were fixed with Next.js `connection()` so they query only at request time.
- The deployed read-only smoke test checks pages, employee list, filter options, currencies, insights, distribution totals, validation failures and not-found rendering.

## Future improvements

- Add `pg_trgm` indexes if substring search becomes a measured bottleneck.
- Add cursor pagination if the employee count or concurrent changes make offset paging slow or unstable.
- Cache relatively stable filter options with an explicit invalidation strategy.
- Precompute or cache analytics if the organization grows far beyond 10,000 employees.
- Add authentication, authorization, audit logs and rate limiting before exposing real salary data.
