"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import {
  ApiRequestError,
  changeSalary,
  type EmployeeDto,
  type SalaryChangeResultDto,
} from "../api-client";
import { prepareSalaryChange, type SalaryChangeErrors, type SalaryChangeValues } from "../salary-change-form";
import { TextField } from "./text-field";

interface ChangeSalaryDialogProps {
  employee: EmployeeDto;
  /** Called with the updated employee and the new history record after a successful change. */
  onChanged: (result: SalaryChangeResultDto) => void;
}

const UNEXPECTED_MESSAGE = "Something went wrong. Please try again.";

export function ChangeSalaryDialog({ employee, onChanged }: ChangeSalaryDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Change salary</Button>

      {/* Closing is blocked mid-save, so a request cannot be abandoned half way. */}
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          {/* The form is mounted only while open, so it starts empty every time. */}
          <ChangeSalaryForm
            employee={employee}
            pending={pending}
            onPendingChange={setPending}
            onCancel={() => setOpen(false)}
            onDone={(result) => {
              setOpen(false);
              onChanged(result);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ChangeSalaryFormProps {
  employee: EmployeeDto;
  pending: boolean;
  onPendingChange: (pending: boolean) => void;
  onCancel: () => void;
  onDone: (result: SalaryChangeResultDto) => void;
}

function ChangeSalaryForm({ employee, pending, onPendingChange, onCancel, onDone }: ChangeSalaryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<SalaryChangeValues>({ salary: "", reason: "" });
  const [errors, setErrors] = useState<SalaryChangeErrors>({});
  const [general, setGeneral] = useState<string | undefined>();

  function change(field: keyof SalaryChangeValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function showErrors(found: SalaryChangeErrors, generalMessage?: string) {
    setErrors(found);
    setGeneral(generalMessage);
    const first = found.salary ? "salary" : found.reason ? "reason" : null;
    if (first) {
      const input = formRef.current?.elements.namedItem(first);
      if (input instanceof HTMLElement) input.focus();
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setGeneral(undefined);

    const result = prepareSalaryChange(employee.currentSalary, values);
    if (!result.ok) return showErrors(result.errors);

    onPendingChange(true);
    try {
      onDone(await changeSalary(employee.id, result.payload));
    } catch (error) {
      if (error instanceof ApiRequestError) {
        const fieldErrors: SalaryChangeErrors = {
          salary: error.fields.salary?.[0],
          reason: error.fields.reason?.[0],
        };
        const blamedAField = Boolean(fieldErrors.salary || fieldErrors.reason);
        showErrors(fieldErrors, blamedAField ? undefined : error.message);
      } else {
        showErrors({}, UNEXPECTED_MESSAGE);
      }
    } finally {
      onPendingChange(false);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{`Change salary for ${employee.fullName}`}</DialogTitle>
        <DialogDescription>
          Current salary <span className="font-medium">{formatMoney(employee.currentSalary, employee.currency)}</span>{" "}
          <span className="text-xs">{employee.currency}</span>. The change takes effect today and is added to the
          salary history.
        </DialogDescription>
      </DialogHeader>

      {general && (
        <p role="alert" className="border-destructive/30 bg-destructive/5 rounded-lg border p-3 text-sm">
          {general}
        </p>
      )}

      <TextField
        name="salary"
        label={`New salary per year (${employee.currency})`}
        inputMode="numeric"
        value={values.salary}
        error={errors.salary}
        onChange={(value) => change("salary", value)}
        hint="A whole number, in the employee's currency."
      />
      <TextField
        name="reason"
        label="Reason (optional)"
        value={values.reason}
        error={errors.reason}
        onChange={(value) => change("reason", value)}
        maxLength={200}
      />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save salary"}
        </Button>
      </DialogFooter>
    </form>
  );
}
