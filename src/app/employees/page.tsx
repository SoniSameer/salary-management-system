import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { DirectoryFallback } from "@/features/employees/components/directory-fallback";
import { EmployeeDirectory } from "@/features/employees/components/employee-directory";

export const metadata: Metadata = { title: "Employees" };

// The directory reads the URL, so it sits inside Suspense. The heading and the
// placeholder are prerendered, and the directory takes over in the browser.
export default function EmployeesPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">People operations</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[32px]">Employees</h1>
          <p className="text-muted-foreground text-sm sm:text-[15px]">
            Manage employee profiles, compensation and salary history in one place.
          </p>
        </div>
        <Link href="/employees/new" className={buttonVariants({ size: "lg" })}>
          Add employee
        </Link>
      </div>
      <Suspense fallback={<DirectoryFallback />}>
        <EmployeeDirectory />
      </Suspense>
    </div>
  );
}
