"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, isAbortError } from "./api-request";

interface Settled<T> {
  /** Which request this result belongs to. */
  requestId: string;
  data?: T;
  error?: ApiRequestError;
}

export interface ApiResource<T> {
  /** Data for the CURRENT key only. Never data left over from a previous key. */
  data: T | undefined;
  error: ApiRequestError | undefined;
  isLoading: boolean;
  retry: () => void;
}

/**
 * Loads data for a key, such as a currency. When the key changes, the previous
 * request is cancelled and the previous key's data is dropped straight away,
 * so figures for one currency are never shown under another. A response that
 * arrives late for an old key is ignored.
 *
 * Pass `null` as the key to wait, for example until a currency is known.
 */
export function useApiResource<T>(
  key: string | null,
  load: (signal: AbortSignal) => Promise<T>,
): ApiResource<T> {
  const [retryCount, setRetryCount] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const requestId = key === null ? null : `${key}#${retryCount}`;

  useEffect(() => {
    if (requestId === null) return;
    const controller = new AbortController();

    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ requestId, data });
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        const apiError =
          error instanceof ApiRequestError
            ? error
            : new ApiRequestError("Something went wrong. Please try again.", null);
        setSettled({ requestId, error: apiError });
      },
    );

    return () => controller.abort();
    // `requestId` already encodes the key and the retry count. `load` is expected to
    // describe the same request, so it is deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const current = requestId !== null && settled?.requestId === requestId ? settled : null;

  return {
    data: current?.data,
    error: current?.error,
    isLoading: requestId !== null && current === null,
    retry: useCallback(() => setRetryCount((count) => count + 1), []),
  };
}
