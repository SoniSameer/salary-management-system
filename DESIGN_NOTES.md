# Visual refactor notes

## Direction

The Salary Management app now uses a restrained B2B SaaS visual language inspired by Linear, Stripe Dashboard and Vercel:

- cool neutral page background with white card surfaces;
- indigo as the single confident product accent;
- compact Geist typography with clear 12/14/16/20/32px hierarchy;
- 1px borders, modest shadows and 8/12px corner radii;
- compact controls and generous page-level whitespace;
- responsive cards and horizontally scrollable data tables.

## Tokens

The primary design tokens live in `src/app/globals.css`:

- neutral background, foreground, card, muted and border colors;
- indigo primary/accent/ring colors;
- green success and amber demo-notice colors;
- chart color scale;
- shared radius and shadow tokens.

Existing semantic Tailwind classes (`bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-destructive/5`) remain in use, so the visual system stays compatible with the existing shadcn primitives.

## Employees page

- Added a product-oriented page eyebrow and explanatory subtitle while retaining the `Employees` heading and `Add employee` action.
- Grouped search and filters into a surface card with consistent 40px control heights.
- Added a search icon, avatar initials, stronger tabular salary treatment, subtle currency text and accessible row-level Edit actions.
- Kept the table semantic and horizontally scrollable on smaller screens.
- Preserved loading skeletons, retry/error states, empty states, URL-driven filters, pagination and every existing accessible label.

## Insights page

- Grouped currency selection into a dedicated control card and kept the per-currency/no-conversion note prominent.
- Styled the five metrics as responsive KPI cards with compact labels and lightweight visual markers.
- Restyled the Recharts histogram with indigo bars, rounded tops, theme gridlines, tooltips and a highlighted data-table peak row.
- Kept the chart's `role="img"` accessible description and expandable data table unchanged in behavior.
- Wrapped country and job-title breakdowns in card surfaces with currency labels and average-column heat tinting.

## Branding

- `src/components/Logo.tsx` is an original inline SVG mark created for this project. It uses a geometric rounded square with ascending payroll bars and a small coin detail; it contains no text and is legible at 24px/32px.
- `src/app/icon.svg` reuses the same geometry for the Next.js App Router favicon.
- No external icon or downloaded asset is used. The mark is original project artwork, so no third-party license or source attribution applies.


- Existing visible labels, roles, names, IDs, `aria-sort`, `aria-busy`, live regions, alert states and chart descriptions were preserved.
- Focus rings use the shared ring token and remain visible against the new surfaces.
- Status remains written as “Active”/“Inactive” and is not conveyed by color alone.
- The chart retains both a generated text description and a table representation.
- Tables keep semantic headers and mobile overflow.
- The demo warning remains visible and explicitly warns that the app has no login and must not receive real employee information.

## Verification

- Before screenshots were not available as tracked repo artifacts; the current screenshots are stored under `docs/screenshots/visual-refactor/`.
- Visual smoke checks were taken from the production build for `/employees` and `/insights?currency=EUR`.
- Existing behavior tests were not edited. Employee and insights focused tests pass; typecheck and lint pass. The full suite had intermittent 5-second timeouts in form/screen tests when all 34 files ran together, while the affected files pass independently. No test timeout or behavior was changed for this visual-only refactor.
