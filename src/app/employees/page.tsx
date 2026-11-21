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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <Link href="/employees/new" className={buttonVariants()}>
          Add employee
        </Link>
      </div>
      <Suspense fallback={<DirectoryFallback />}>
        <EmployeeDirectory />
      </Suspense>
    </div>
  );
}
