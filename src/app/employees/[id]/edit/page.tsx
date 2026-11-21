import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditEmployee } from "@/features/employees/components/edit-employee";
import { employeeIdSchema } from "@/server/employees/employee-schemas";

export const metadata: Metadata = { title: "Edit employee" };

// `params` is a Promise and is request data, so it is read inside Suspense.
// The heading and loading text are prerendered, and the form fills in at request time.
async function EditEmployeeFromParams({ params }: { params: PageProps<"/employees/[id]/edit">["params"] }) {
  const { id } = await params;

  // A malformed id can never match an employee: show a 404 instead of an API error.
  if (!employeeIdSchema.safeParse(id).success) notFound();

  return <EditEmployee employeeId={id} />;
}

export default function EditEmployeePage({ params }: PageProps<"/employees/[id]/edit">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit employee</h1>
      <Suspense
        fallback={
          <p role="status" className="text-muted-foreground text-sm">
            Loading employee…
          </p>
        }
      >
        <EditEmployeeFromParams params={params} />
      </Suspense>
    </div>
  );
}
