/**
 * Shown on every page. This version has no login, so anyone with the link can
 * view and change the data. The banner says so plainly.
 */
export function DemoBanner() {
  return (
    <aside aria-label="Demo notice" className="bg-foreground text-background px-6 py-2 text-center text-sm">
      <strong className="font-medium">Demo with synthetic data.</strong> There is no login, so anyone with the link can
      view and change it. Do not enter real employee information.
    </aside>
  );
}
