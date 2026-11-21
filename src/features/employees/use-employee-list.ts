"use client";

import { useCallback, useEffect, useState } from "react";
import type { EmployeeFilterOptions, EmployeeListQuery } from "@/server/employees/employee-list";
import { ApiRequestError, fetchEmployees, fetchFilterOptions, type EmployeeListDto } from "./api-client";
import { queryToSearchParams } from "./directory-state";

interface Settled {
  /** Which request this result belongs to. */
  requestId: string;
  data?: EmployeeListDto;
  error?: ApiRequestError;
  /** The most recent successful result, kept so the table does not blank out between pages. */
  lastData?: EmployeeListDto;
}

export interface EmployeeListState {
  /** Data for the current query, or the previous page's data while the new one loads. */
  data: EmployeeListDto | undefined;
  error: ApiRequestError | undefined;
  /** True until the current query has finished, successfully or not. */
  isLoading: boolean;
  retry: () => void;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function toApiRequestError(error: unknown): ApiRequestError {
  return error instanceof ApiRequestError
    ? error
    : new ApiRequestError("Something went wrong. Please try again.", null);
}

/**
 * Loads one page of the directory. Each change of query cancels the previous
 * request, and a result that belongs to an old query is never shown.
 */
export function useEmployeeList(query: EmployeeListQuery): EmployeeListState {
  const [retryCount, setRetryCount] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);

  const requestId = `${queryToSearchParams(query).toString()}#${retryCount}`;

  useEffect(() => {
    const controller = new AbortController();

    fetchEmployees(query, controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setSettled({ requestId, data, lastData: data });
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbort(error)) return;
        setSettled((previous) => ({
          requestId,
          error: toApiRequestError(error),
          lastData: previous?.lastData,
        }));
      },
    );

    return () => controller.abort();
    // `requestId` already encodes every field of `query`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const current = settled?.requestId === requestId ? settled : null;

  return {
    data: current?.data ?? settled?.lastData,
    error: current?.error,
    isLoading: current === null,
    retry: useCallback(() => setRetryCount((count) => count + 1), []),
  };
}

export interface FilterOptionsState {
  options: EmployeeFilterOptions | undefined;
  failed: boolean;
}

/** Loads the dropdown values once. The directory still works if this fails. */
export function useFilterOptions(): FilterOptionsState {
  const [state, setState] = useState<FilterOptionsState>({ options: undefined, failed: false });

  useEffect(() => {
    const controller = new AbortController();

    fetchFilterOptions(controller.signal).then(
      (options) => {
        if (!controller.signal.aborted) setState({ options, failed: false });
      },
      (error: unknown) => {
        if (!controller.signal.aborted && !isAbort(error)) setState({ options: undefined, failed: true });
      },
    );

    return () => controller.abort();
  }, []);

  return state;
}
