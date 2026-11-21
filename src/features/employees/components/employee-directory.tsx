"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { formatNumber } from "@/lib/format";
import type { EmployeeListQuery } from "@/server/employees/employee-list";
import {
  clearFilters,
  hasActiveFilters,
  parseDirectoryQuery,
  queryToSearchParams,
  toggleSort,
  withChange,
  type DirectoryChange,
} from "../directory-state";
import { useEmployeeList, useFilterOptions } from "../use-employee-list";
import { DirectoryFilters } from "./directory-filters";
import { EmptyState, ErrorState } from "./directory-states";
import { EmployeeTable } from "./employee-table";
import { Pagination } from "./pagination";

const DIRECTORY_STATE_KEY = "salary-management:employees-query";

function restoreDirectoryQuery(params: URLSearchParams): EmployeeListQuery {
  if ([...params.keys()].length > 0 || typeof window === "undefined") return parseDirectoryQuery(params);
  const saved = window.sessionStorage.getItem(DIRECTORY_STATE_KEY);
  return saved ? parseDirectoryQuery(new URLSearchParams(saved)) : parseDirectoryQuery(params);
}

function summary(page: number, pageSize: number, shown: number, total: number): string {
  const first = (page - 1) * pageSize + 1;
  const noun = total === 1 ? "employee" : "employees";
  return `Showing ${formatNumber(first)}–${formatNumber(first + shown - 1)} of ${formatNumber(total)} ${noun}`;
}

export function EmployeeDirectory() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const query = useMemo(() => {
    const restored = restoreDirectoryQuery(searchParams);
    return restored.search && restored.status === "active" ? { ...restored, status: "all" as const } : restored;
  }, [searchParams]);
  const filterOptions = useFilterOptions();
  const list = useEmployeeList(query);

  function navigate(next: EmployeeListQuery) {
    const qs = queryToSearchParams(next).toString();
    window.sessionStorage.setItem(DIRECTORY_STATE_KEY, qs);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DIRECTORY_STATE_KEY, queryToSearchParams(query).toString());
    }
  }, [query]);

  const change = (patch: DirectoryChange) => navigate(withChange(query, patch));
  const { data } = list;

  return (
    <div className="flex flex-col gap-5">
      <DirectoryFilters
        query={query}
        filterOptions={filterOptions}
        onChange={change}
        onClear={() => navigate(clearFilters(query))}
      />

      {query.sortBy === "currentSalary" && !query.currency && (
        <p role="note" className="border-primary/20 bg-primary/5 text-primary rounded-lg border p-3 text-sm">
          Salaries in different currencies cannot be compared. Choose a currency to rank salaries fairly.
        </p>
      )}

      {list.error ? (
        <ErrorState message={list.error.message} onRetry={list.retry} />
      ) : !data || (list.isLoading && data.items.length === 0) ? (
        <>
          <p role="status" className="sr-only">
            Loading employees…
          </p>
          <EmployeeTable query={query} busy search={query.search} onSort={(field) => navigate(toggleSort(query, field))} />
        </>
      ) : data.items.length === 0 ? (
        <EmptyState
          reason={data.total > 0 ? "past-last-page" : hasActiveFilters(query) ? "filtered" : "no-employees"}
          onClearFilters={() => navigate(clearFilters(query))}
          onFirstPage={() => change({ page: 1 })}
        />
      ) : (
        <>
          <p aria-live="polite" className="text-muted-foreground text-sm tabular-nums">
            {summary(data.page, data.pageSize, data.items.length, data.total)}
          </p>
          <EmployeeTable
            employees={data.items}
            query={query}
            busy={list.isLoading}
            search={query.search}
            onSort={(field) => navigate(toggleSort(query, field))}
          />
          <Pagination
            currentPage={query.page}
            shownPage={data.page}
            totalPages={data.totalPages}
            onPageChange={(page) => change({ page })}
          />
        </>
      )}
    </div>
  );
}
