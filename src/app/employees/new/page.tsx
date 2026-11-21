import type { Metadata } from "next";
import { CreateEmployee } from "@/features/employees/components/create-employee";

export const metadata: Metadata = { title: "Add employee" };

export default function NewEmployeePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add employee</h1>
      <CreateEmployee />
    </div>
  );
}
