import { useSyncExternalStore } from "react";

/**
 * A tiny stand-in for `next/navigation` that behaves like a real URL: pushing
 * a new URL updates the search params and re-renders components that read them.
 *
 * Use it in a test file with:
 *   vi.mock("next/navigation", async () => (await import("@/test/mock-navigation")).navigationModule);
 */

let params = new URLSearchParams();
let pathname = "/employees";
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setSearch(search: string): void {
  // A new object on every change, which is what useSyncExternalStore needs.
  params = new URLSearchParams(search);
  listeners.forEach((listener) => listener());
}

/** Sets the URL before rendering, for example `setUrl("?country=Germany")` or `setUrl("", "/insights")`. */
export function setUrl(search: string, path = "/employees"): void {
  pathname = path;
  setSearch(search);
  navigationLog.pushes.length = 0;
}

export const navigationLog = { pushes: [] as string[] };

function navigate(href: string): void {
  navigationLog.pushes.push(href);
  setSearch(new URL(href, "http://localhost").search);
}

export const navigationModule = {
  useSearchParams: () =>
    useSyncExternalStore(
      subscribe,
      () => params,
      () => params,
    ),
  usePathname: () => pathname,
  useRouter: () => ({
    push: navigate,
    replace: navigate,
    refresh: () => {},
    back: () => {},
    forward: () => {},
    prefetch: () => {},
  }),
};
