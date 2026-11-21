/** A failed API call, carrying a message that is safe to show to the user. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly code: string | null = null,
    /** Messages by form field, when the API says which field is wrong. */
    public readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const NETWORK_MESSAGE = "Could not reach the server. Check your connection and try again.";

/** Calls the API and returns the JSON body, or throws an ApiRequestError with a readable message. */
export async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    // An aborted request is not a failure. Let the caller recognise and ignore it.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiRequestError(NETWORK_MESSAGE, null);
  }

  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}

export function sendJson(method: "POST" | "PATCH", body?: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

async function toApiError(response: Response): Promise<ApiRequestError> {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string; fields?: Record<string, string[]> };
    };
    if (body.error?.message) {
      return new ApiRequestError(
        body.error.message,
        response.status,
        body.error.code ?? null,
        body.error.fields ?? {},
      );
    }
  } catch {
    // The body was not JSON. Fall through to the generic message.
  }
  return new ApiRequestError(`The server returned an error (${response.status}).`, response.status);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
