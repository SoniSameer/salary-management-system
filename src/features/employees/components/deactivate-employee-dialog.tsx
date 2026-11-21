"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "../api-client";

interface DeactivateEmployeeDialogProps {
  employeeName: string;
  /** Resolves when the employee is deactivated. Throws to show an error in the dialog. */
  onConfirm: () => Promise<void>;
}

/**
 * The deactivate button and its confirmation. Deactivating is not undoable in
 * this version, so the dialog says exactly what happens and stays open with a
 * message if the request fails.
 */
export function DeactivateEmployeeDialog({ employeeName, onConfirm }: DeactivateEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function changeOpen(next: boolean) {
    // Do not let the dialog be dismissed in the middle of the request.
    if (pending) return;
    setOpen(next);
    if (!next) setError(undefined);
  }

  async function confirm() {
    setPending(true);
    setError(undefined);
    try {
      await onConfirm();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Deactivate employee
      </Button>

      <AlertDialog open={open} onOpenChange={changeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Deactivate ${employeeName}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              They will no longer appear in the employee list or in salary insights, and their salary cannot be
              changed. Their record and salary history are kept. This cannot be undone in this version.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={confirm}>
              {pending ? "Deactivating…" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
