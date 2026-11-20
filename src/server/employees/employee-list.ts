import { z } from "zod";
import type { Employee } from "./employee";

/** Columns the directory may be sorted by. Anything else is rejected. */
export const EMPLOYEE_SORT_FIELDS = [
  "fullName",
  "email",
  "country",
  "department",
  "jobTitle",
  "currentSalary",
  "hiredAt",
] as const;

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

/** Browsers send an unset filter as `country=`. Treat blank values as absent. */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, schema.optional());
}

const text = (max: number) => z.string().trim().max(max);

export const employeeListQuerySchema = z.object({
  /** Matches part of the name or email, ignoring case. */
  search: optional(text(100)),
  country: optional(text(80)),
  department: optional(text(80)),
  jobTitle: optional(text(120)),
  currency: optional(
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO currency code"),
  ),
  status: optional(z.enum(["active", "inactive", "all"])).transform((value) => value ?? "active"),
  sortBy: optional(z.enum(EMPLOYEE_SORT_FIELDS)).transform((value) => value ?? "fullName"),
  sortOrder: optional(z.enum(["asc", "desc"])).transform((value) => value ?? "asc"),
  page: optional(z.coerce.number().int().min(1)).transform((value) => value ?? 1),
  pageSize: optional(z.coerce.number().int().min(1).max(MAX_PAGE_SIZE)).transform(
    (value) => value ?? DEFAULT_PAGE_SIZE,
  ),
});

export type EmployeeSortField = (typeof EMPLOYEE_SORT_FIELDS)[number];
export type EmployeeStatusFilter = "active" | "inactive" | "all";

export interface EmployeeListQuery {
  search?: string;
  country?: string;
  department?: string;
  jobTitle?: string;
  currency?: string;
  status: EmployeeStatusFilter;
  sortBy: EmployeeSortField;
  sortOrder: "asc" | "desc";
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface EmployeeListResult {
  items: Employee[];
  /** Number of employees matching the filters, across all pages. */
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Distinct values for the directory's filter dropdowns, sorted A to Z. */
export interface EmployeeFilterOptions {
  countries: string[];
  departments: string[];
  jobTitles: string[];
  currencies: string[];
}
