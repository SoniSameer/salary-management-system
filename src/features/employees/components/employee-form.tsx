"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  ApiRequestError,
  type EmployeeDto,
  type EmployeePatchPayload,
  type NewEmployeePayload,
} from "../api-client";
import {
  emptyFormValues,
  fieldErrorsFromApi,
  FORM_FIELDS,
  hasChanges,
  prepareCreate,
  prepareEdit,
  valuesFromEmployee,
  type EmployeeFormValues,
  type FormErrors,
  type FormField,
} from "../employee-form";
import { useFilterOptions } from "../use-employee-list";
import { TextField } from "./text-field";

type EmployeeFormProps =
  | { mode: "create"; onSubmit: (payload: NewEmployeePayload) => Promise<void> }
  | { mode: "edit"; employee: EmployeeDto; onSubmit: (patch: EmployeePatchPayload) => Promise<void> };

const UNEXPECTED_MESSAGE = "Something went wrong. Please try again.";

export function EmployeeForm(props: EmployeeFormProps) {
  const isEdit = props.mode === "edit";
  const employee = props.mode === "edit" ? props.employee : undefined;

  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<EmployeeFormValues>(() =>
    employee ? valuesFromEmployee(employee) : emptyFormValues(),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [general, setGeneral] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const { options } = useFilterOptions();

  function change(field: FormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    // Editing a field clears its own message, and the "saved" confirmation.
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaved(false);
  }

  /** Moves keyboard and screen reader focus to the first field with an error. */
  function focusFirstError(found: FormErrors) {
    const first = FORM_FIELDS.find((field) => found[field]);
    if (!first) return;
    const input = formRef.current?.elements.namedItem(first);
    if (input instanceof HTMLElement) input.focus();
  }

  function showErrors(found: FormErrors, generalMessage?: string) {
    setErrors(found);
    setGeneral(generalMessage);
    focusFirstError(found);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setGeneral(undefined);
    setSaved(false);

    let send: () => Promise<void>;
    if (props.mode === "create") {
      const result = prepareCreate(values);
      if (!result.ok) return showErrors(result.errors);
      send = () => props.onSubmit(result.payload);
    } else {
      const result = prepareEdit(props.employee, values);
      if (result.kind === "invalid") return showErrors(result.errors);
      if (result.kind === "unchanged") return;
      send = () => props.onSubmit(result.patch);
    }

    setPending(true);
    try {
      await send();
      setErrors({});
      if (props.mode === "edit") setSaved(true);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        const mapped = fieldErrorsFromApi(error);
        showErrors(mapped.fieldErrors, mapped.general);
      } else {
        showErrors({}, UNEXPECTED_MESSAGE);
      }
    } finally {
      setPending(false);
    }
  }

  const canSave = isEdit ? hasChanges(props.employee, values) : true;

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="flex max-w-2xl flex-col gap-5">
      <p className="text-muted-foreground text-sm">All fields are required.</p>

      {general && (
        <div role="alert" className="border-destructive/30 bg-destructive/5 rounded-lg border p-3 text-sm">
          {general}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="fullName" label="Full name" value={values.fullName} error={errors.fullName} onChange={(v) => change("fullName", v)} autoComplete="name" maxLength={120} />
        <TextField name="email" label="Email" type="email" value={values.email} error={errors.email} onChange={(v) => change("email", v)} autoComplete="email" maxLength={254} />
          <TextField name="country" label="Country" selectOptions={options?.countries.map((value) => ({ value, label: value }))} selectPlaceholder="Select country" value={values.country} error={errors.country} onChange={(v) => change("country", v)} maxLength={80} />
          <TextField name="department" label="Department" selectOptions={options?.departments.map((value) => ({ value, label: value }))} selectPlaceholder="Select department" value={values.department} error={errors.department} onChange={(v) => change("department", v)} maxLength={80} />
          <TextField name="jobTitle" label="Job title" selectOptions={options?.jobTitles.map((value) => ({ value, label: value }))} selectPlaceholder="Select job title" value={values.jobTitle} error={errors.jobTitle} onChange={(v) => change("jobTitle", v)} maxLength={120} />
        <TextField name="hiredAt" label="Hire date" type="date" value={values.hiredAt} error={errors.hiredAt} onChange={(v) => change("hiredAt", v)} />

        {employee ? (
          <dl className="bg-muted flex flex-col gap-1 rounded-lg p-3 text-sm sm:col-span-2">
            <dt className="text-muted-foreground text-xs font-medium">Current salary</dt>
            <dd>
              <span className="font-medium tabular-nums">{formatMoney(employee.currentSalary, employee.currency)}</span>{" "}
              <span className="text-muted-foreground text-xs">{employee.currency}</span>
            </dd>
            <dd className="text-muted-foreground text-xs">
              Salary and currency are changed with a salary change, which keeps the salary history.
            </dd>
          </dl>
        ) : (
          <>
            <TextField name="currency" label="Currency" selectOptions={options?.currencies.map((value) => ({ value, label: value }))} selectPlaceholder="Select currency" value={values.currency} error={errors.currency} onChange={(v) => change("currency", v)} hint="3-letter code, for example EUR. It cannot be changed later." maxLength={3} />
            <TextField name="salary" label="Starting salary (per year)" inputMode="numeric" value={values.salary} error={errors.salary} onChange={(v) => change("salary", v)} hint="In the currency above, as a whole number." />
          </>
        )}
      </div>

      {/* Suggestions from existing data. New values are still allowed. */}
      <datalist id="country-options">{options?.countries.map((value) => <option key={value} value={value} />)}</datalist>
      <datalist id="department-options">{options?.departments.map((value) => <option key={value} value={value} />)}</datalist>
      <datalist id="job-title-options">{options?.jobTitles.map((value) => <option key={value} value={value} />)}</datalist>
      <datalist id="currency-options">{options?.currencies.map((value) => <option key={value} value={value} />)}</datalist>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !canSave}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add employee"}
        </Button>
        <Link href="/employees" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
        {saved && (
          <p role="status" className="text-sm font-medium">
            Changes saved
          </p>
        )}
      </div>
    </form>
  );
}
