import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "./api-request";
import { useApiResource } from "./use-api-resource";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useApiResource", () => {
  it("is loading, then has the data", async () => {
    const gate = deferred<string>();
    const { result } = renderHook(() => useApiResource("eur", () => gate.promise));

    expect(result.current).toMatchObject({ isLoading: true, data: undefined, error: undefined });
    await act(async () => gate.resolve("euro figures"));

    expect(result.current).toMatchObject({ isLoading: false, data: "euro figures", error: undefined });
  });

  it("does not load anything while the key is null", () => {
    const load = vi.fn().mockResolvedValue("x");
    const { result } = renderHook(() => useApiResource(null, load));

    expect(load).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ isLoading: false, data: undefined, error: undefined });
  });

  it("never shows the previous key's data while the next key loads", async () => {
    // For currencies this matters: euro figures must not appear under a dollar heading.
    const eur = deferred<string>();
    const usd = deferred<string>();
    const { result, rerender } = renderHook(
      ({ currency }) => useApiResource(currency, () => (currency === "EUR" ? eur.promise : usd.promise)),
      { initialProps: { currency: "EUR" } },
    );
    await act(async () => eur.resolve("euro figures"));
    expect(result.current.data).toBe("euro figures");

    rerender({ currency: "USD" });

    expect(result.current).toMatchObject({ isLoading: true, data: undefined });
    await act(async () => usd.resolve("dollar figures"));
    expect(result.current).toMatchObject({ isLoading: false, data: "dollar figures" });
  });

  it("ignores a slow response for an earlier key that finishes last", async () => {
    const eur = deferred<string>();
    const usd = deferred<string>();
    const { result, rerender } = renderHook(
      ({ currency }) => useApiResource(currency, () => (currency === "EUR" ? eur.promise : usd.promise)),
      { initialProps: { currency: "EUR" } },
    );

    rerender({ currency: "USD" });
    await act(async () => usd.resolve("dollar figures"));
    await act(async () => eur.resolve("euro figures"));

    expect(result.current.data).toBe("dollar figures");
  });

  it("aborts the request of an earlier key", async () => {
    const signals: AbortSignal[] = [];
    const { rerender } = renderHook(
      ({ currency }) =>
        useApiResource(currency, (signal) => {
          signals.push(signal);
          return new Promise<string>(() => {});
        }),
      { initialProps: { currency: "EUR" } },
    );

    rerender({ currency: "USD" });

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it("reports an API error with its message", async () => {
    const { result } = renderHook(() =>
      useApiResource("eur", () => Promise.reject(new ApiRequestError("Something went wrong", 500))),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toMatchObject({ message: "Something went wrong", status: 500 });
  });

  it("turns an unexpected error into a readable one", async () => {
    const { result } = renderHook(() => useApiResource("eur", () => Promise.reject(new Error("boom"))));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toBe("Something went wrong. Please try again.");
  });

  it("retries the same key", async () => {
    let attempts = 0;
    const { result } = renderHook(() =>
      useApiResource("eur", () => {
        attempts += 1;
        return attempts === 1 ? Promise.reject(new ApiRequestError("Something went wrong", 500)) : Promise.resolve("ok");
      }),
    );
    await waitFor(() => expect(result.current.error).toBeDefined());

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.data).toBe("ok"));
    expect(result.current.error).toBeUndefined();
  });

  it("clears a previous key's error when the key changes", async () => {
    const { result, rerender } = renderHook(
      ({ currency }) =>
        useApiResource(currency, () =>
          currency === "EUR" ? Promise.reject(new ApiRequestError("Nope", 500)) : Promise.resolve("dollar figures"),
        ),
      { initialProps: { currency: "EUR" } },
    );
    await waitFor(() => expect(result.current.error).toBeDefined());

    rerender({ currency: "USD" });

    expect(result.current.error).toBeUndefined();
    await waitFor(() => expect(result.current.data).toBe("dollar figures"));
  });
});
