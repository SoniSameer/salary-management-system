"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, fetchEmployeeDetails, type EmployeeDetailsDto } from "./api-client";

interface Settled {
  /** Which request this result belongs to. */
  requestId: string;
  data?: EmployeeDetailsDto;
  error?: ApiRequestError;
}

export interface EmployeeDetailsState {
  data: EmployeeDetailsDto | undefined;
  error: ApiRequestError | undefined;
  isLoading: boolean;
  retry: () => void;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Loads one employee with their salary history. Loading is derived, so no state is set inside the effect body. */
export function useEmployeeDetails(id: string): EmployeeDetailsState {
  const [retryCount, setRetryCount] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const requestId = `${id}#${retryCount}`;

  useEffect(() => {
    const controller = new AbortController();

    fetchEmployeeDetails(id, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ requestId, data });
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbort(error)) return;
        const apiError =
          error instanceof ApiRequestError
            ? error
            : new ApiRequestError("Something went wrong. Please try again.", null);
        setSettled({ requestId, error: apiError });
      },
    );

    return () => controller.abort();
    // `requestId` already encodes both `id` and the retry count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const current = settled?.requestId === requestId ? settled : null;

  return {
    data: current?.data,
    error: current?.error,
    isLoading: current === null,
    retry: useCallback(() => setRetryCount((count) => count + 1), []),
  };
}
