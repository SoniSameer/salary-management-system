/**
 * Shown on every page. This version has no login, so anyone with the link can
 * view and change the data. The banner says so plainly.
 */
export function DemoBanner() {
  return (
    <aside aria-label="Demo notice" className="border-b border-amber-200/70 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950 sm:text-sm dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
      <strong className="font-semibold">Demo with synthetic data.</strong> There is no login, so anyone with the link can
      view and change it. Do not enter real employee information.
    </aside>
  );
}
