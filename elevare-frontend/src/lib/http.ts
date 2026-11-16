/* a 401 (except the sign-in check) means the session ended: listeners are told */
import {apiUrl} from '@/services/apiBase';

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/* readable message for anything a request can throw */
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : 'Something went wrong. Please try again.';

export const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export interface RequestOptions {
  method?: Method;
  /* JSON body */
  body?: unknown;
  /* multipart (file uploads) */
  form?: FormData;
  signal?: AbortSignal;
  /* sign-in and the initial session check expect 401s */
  expect401?: boolean;
}

const unauthorizedListeners = new Set<() => void>();
/* returns the unsubscribe function */
export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export async function request<T>(
  path: string,
  {method, body, form, signal, expect401}: RequestOptions = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl('/api' + path), {
      method: method ?? (body !== undefined || form ? 'POST' : 'GET'),
      credentials: 'include',
      headers: body !== undefined ? {'Content-Type': 'application/json'} : undefined,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal
    });
  } catch (e) {
    if (isAbort(e)) throw e;
    throw new ApiError('Cannot reach the server. Check your connection, or that the backend is running.', 0);
  }
  const data: unknown = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !expect401) unauthorizedListeners.forEach(l => l());
    const message = (data as {error?: unknown}).error;
    throw new ApiError(typeof message === 'string' ? message : `Request failed (${res.status}).`, res.status);
  }
  return data as T;
}
