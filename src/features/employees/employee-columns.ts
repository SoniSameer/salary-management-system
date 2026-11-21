import type { EmployeeSortField } from "@/server/employees/employee-list";

export interface Column {
  label: string;
  /** Present only for columns the API can sort by. */
  sortField?: EmployeeSortField;
  align?: "right";
  /** Keep the header for screen readers but do not show it. */
  visuallyHidden?: boolean;
}

/** The directory's columns, shared by the live table and its loading placeholder. */
export const COLUMNS: Column[] = [
  { label: "Name", sortField: "fullName" },
  { label: "Country", sortField: "country" },
  { label: "Department", sortField: "department" },
  { label: "Job title", sortField: "jobTitle" },
  { label: "Hired", sortField: "hiredAt" },
  { label: "Salary", sortField: "currentSalary", align: "right" },
  { label: "Status" },
  { label: "Actions", visuallyHidden: true },
];
