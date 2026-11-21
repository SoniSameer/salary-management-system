"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NativeSelect, type SelectOption } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EmployeeListQuery } from "@/server/employees/employee-list";
import type { FilterOptionsState } from "../use-employee-list";
import { hasActiveFilters, queryToSearchParams, type DirectoryChange } from "../directory-state";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
];

function withAll(allLabel: string, values: string[] | undefined, current: string | undefined): SelectOption[] {
  const unique = new Set(values ?? []);
  if (current) unique.add(current);
  return [{ value: "", label: allLabel }, ...[...unique].map((value) => ({ value, label: value }))];
}

interface DirectoryFiltersProps {
  query: EmployeeListQuery;
  filterOptions: FilterOptionsState;
  onChange: (change: DirectoryChange) => void;
  onClear: () => void;
}

export function DirectoryFilters({ query, filterOptions, onChange, onClear }: DirectoryFiltersProps) {
  const { options, failed } = filterOptions;
  const disabled = !options;
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(query.search ?? "");
  const lastCommittedSearchRef = useRef(query.search ?? "");
  const [draftSearch, setDraftSearch] = useState(query.search ?? "");

  useEffect(() => {
    const committed = query.search ?? "";
    // Only synchronize from the URL when it was changed externally. A debounce
    // commit caused by this component must never overwrite characters currently
    // being typed into the input.
    if (committed !== lastCommittedSearchRef.current && committed !== draftRef.current) {
      draftRef.current = committed;
      lastCommittedSearchRef.current = committed;
      setDraftSearch(committed);
    }
  }, [query.search]);

  function replaceSearch(value: string) {
    const trimmed = value.trim();
    draftRef.current = trimmed;
    lastCommittedSearchRef.current = trimmed;
    const next = { ...query, search: trimmed || undefined, page: 1 };
    const qs = queryToSearchParams(next).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    const value = draftSearch.trim();
    if (value.length !== 0 && value.length < 2) return;
    if (value === (query.search ?? "")) return;

    const timeout = window.setTimeout(() => replaceSearch(value), 300);
    return () => window.clearTimeout(timeout);
  }, [draftSearch, query.search]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    replaceSearch(draftSearch);
    inputRef.current?.focus();
  }

  function handleDraftChange(value: string) {
    const nextValue = value.slice(0, 100);
    draftRef.current = nextValue;
    setDraftSearch(nextValue);
  }

  function clearSearch() {
    draftRef.current = "";
    setDraftSearch("");
    replaceSearch("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="surface-card flex flex-col gap-5 p-4 sm:p-5">
      <form role="search" aria-label="Search employees" onSubmit={submitSearch} className="flex flex-col gap-1.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="employee-search" className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Search</label>
          <div className="relative">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" strokeLinecap="round" /></svg>
            <Input
              ref={inputRef}
              id="employee-search"
              name="search"
              type="search"
              placeholder="Name or email"
              value={draftSearch}
              onChange={(event) => handleDraftChange(event.target.value)}
              maxLength={100}
              autoComplete="off"
              className="h-10 pr-10 pl-9"
            />
            {draftSearch && <button type="button" aria-label="Clear search" title="Clear search" onClick={clearSearch} className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-lg leading-none focus-visible:ring-2 focus-visible:outline-none">×</button>}
            {draftSearch.trim().length >= 2 && draftSearch.trim() !== (query.search ?? "") && <span role="status" className="text-primary pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium">Searching…</span>}
          </div>
        </div>
      </form>

      <div className="flex flex-wrap items-end gap-3 border-t pt-4">
        <NativeSelect label="Country" value={query.country ?? ""} options={withAll("All countries", options?.countries, query.country)} disabled={disabled} onChange={(value) => onChange({ country: value || undefined })} />
        <NativeSelect label="Department" value={query.department ?? ""} options={withAll("All departments", options?.departments, query.department)} disabled={disabled} onChange={(value) => onChange({ department: value || undefined })} />
        <NativeSelect label="Job title" value={query.jobTitle ?? ""} options={withAll("All job titles", options?.jobTitles, query.jobTitle)} disabled={disabled} onChange={(value) => onChange({ jobTitle: value || undefined })} />
        <NativeSelect label="Currency" value={query.currency ?? ""} options={withAll("All currencies", options?.currencies, query.currency)} disabled={disabled} onChange={(value) => onChange({ currency: value || undefined })} />
        <NativeSelect label="Status" value={query.status} options={STATUS_OPTIONS} onChange={(value) => onChange({ status: value as EmployeeListQuery["status"] })} />
        {hasActiveFilters(query) && <Button variant="ghost" onClick={onClear} className="h-10 px-2 text-sm font-medium text-primary underline-offset-4 hover:text-primary hover:underline">Clear filters</Button>}
      </div>

      {failed && <p role="status" className="text-muted-foreground text-sm">The filter lists could not be loaded. Search and paging still work.</p>}
    </div>
  );
}
