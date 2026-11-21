/**
 * Typed API error representing non-2xx HTTP responses from CivicResolve API.
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly data?: unknown;

  constructor(status: number, statusText: string, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

/**
 * Small typed fetch wrapper communicating with same-origin /api endpoints.
 * Never logs response bodies or internal payload data.
 *
 * @param path - API path (e.g. '/api/health' or '/health')
 * @param init - Optional RequestInit fetch configuration
 * @returns Parsed JSON response payload
 */
export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(normalizedPath, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let errorPayload: unknown;
    let errorMessage = `HTTP request failed with status ${response.status} (${response.statusText})`;

    try {
      errorPayload = await response.json();
      if (
        errorPayload &&
        typeof errorPayload === 'object' &&
        'message' in errorPayload &&
        typeof (errorPayload as { message: unknown }).message === 'string'
      ) {
        errorMessage = (errorPayload as { message: string }).message;
      }
    } catch {
      // If response body is not JSON, retain default error message without logging body
    }

    throw new ApiClientError(response.status, response.statusText, errorMessage, errorPayload);
  }

  return response.json() as Promise<T>;
}
