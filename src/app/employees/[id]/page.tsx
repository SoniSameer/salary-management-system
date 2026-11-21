import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EmployeeDetails } from "@/features/employees/components/employee-details";
import { employeeIdSchema } from "@/server/employees/employee-schemas";

export const metadata: Metadata = { title: "Employee" };

// `params` is a Promise and is request data, so it is read inside Suspense.
// The loading text is prerendered, and the details fill in at request time.
async function EmployeeDetailsFromParams({ params }: { params: PageProps<"/employees/[id]">["params"] }) {
  const { id } = await params;

  // A malformed id can never match an employee: show a 404 instead of an API error.
  if (!employeeIdSchema.safeParse(id).success) notFound();

  return <EmployeeDetails employeeId={id} />;
}

export default function EmployeePage({ params }: PageProps<"/employees/[id]">) {
  return (
    <Suspense
      fallback={
        <p role="status" className="text-muted-foreground text-sm">
          Loading employee…
        </p>
      }
    >
      <EmployeeDetailsFromParams params={params} />
    </Suspense>
  );
}
