import { NativeSelect, type SelectOption } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EmployeeListQuery } from "@/server/employees/employee-list";
import type { FilterOptionsState } from "../use-employee-list";
import { hasActiveFilters, type DirectoryChange } from "../directory-state";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
];

/** "All countries" followed by the values, keeping the current one even before the list loads. */
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

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("search") ?? "").trim();
    onChange({ search: value || undefined });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        role="search"
        aria-label="Search employees"
        onSubmit={submitSearch}
        className="flex items-end gap-2"
      >
        <div className="flex max-w-sm flex-1 flex-col gap-1">
          <label htmlFor="employee-search" className="text-muted-foreground text-xs font-medium">
            Search
          </label>
          {/* Keyed by the URL value so Clear filters and back/forward reset the text. */}
          <Input
            key={query.search ?? ""}
            id="employee-search"
            name="search"
            type="search"
            placeholder="Name or email"
            defaultValue={query.search ?? ""}
            maxLength={100}
            autoComplete="off"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="flex flex-wrap items-end gap-3">
        <NativeSelect
          label="Country"
          value={query.country ?? ""}
          options={withAll("All countries", options?.countries, query.country)}
          disabled={disabled}
          onChange={(value) => onChange({ country: value || undefined })}
        />
        <NativeSelect
          label="Department"
          value={query.department ?? ""}
          options={withAll("All departments", options?.departments, query.department)}
          disabled={disabled}
          onChange={(value) => onChange({ department: value || undefined })}
        />
        <NativeSelect
          label="Job title"
          value={query.jobTitle ?? ""}
          options={withAll("All job titles", options?.jobTitles, query.jobTitle)}
          disabled={disabled}
          onChange={(value) => onChange({ jobTitle: value || undefined })}
        />
        <NativeSelect
          label="Currency"
          value={query.currency ?? ""}
          options={withAll("All currencies", options?.currencies, query.currency)}
          disabled={disabled}
          onChange={(value) => onChange({ currency: value || undefined })}
        />
        <NativeSelect
          label="Status"
          value={query.status}
          options={STATUS_OPTIONS}
          onChange={(value) => onChange({ status: value as EmployeeListQuery["status"] })}
        />
        {hasActiveFilters(query) && (
          <Button variant="ghost" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>

      {failed && (
        <p role="status" className="text-muted-foreground text-sm">
          The filter lists could not be loaded. Search and paging still work.
        </p>
      )}
    </div>
  );
}
