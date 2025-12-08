/**
 * API Client
 * 
 * Type-safe HTTP client with JSON parsing.
 * All services use this client for consistent behavior.
 */

async function throwIfNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Makes a POST request and returns parsed JSON.
 */
export async function post<TResponse, TData = unknown>(
  url: string,
  data?: TData
): Promise<TResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });
  await throwIfNotOk(res);
  return res.json();
}

/**
 * Makes a GET request and returns parsed JSON.
 */
export async function get<TResponse>(url: string): Promise<TResponse> {
  const res = await fetch(url, {
    credentials: 'include',
  });
  await throwIfNotOk(res);
  return res.json();
}

/**
 * Makes a DELETE request and returns parsed JSON.
 */
export async function del<TResponse>(url: string): Promise<TResponse> {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  await throwIfNotOk(res);
  return res.json();
}

/**
 * Makes a PUT request and returns parsed JSON.
 */
export async function put<TResponse, TData = unknown>(
  url: string,
  data?: TData
): Promise<TResponse> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });
  await throwIfNotOk(res);
  return res.json();
}

/**
 * Makes a PATCH request and returns parsed JSON.
 */
export async function patch<TResponse, TData = unknown>(
  url: string,
  data?: TData
): Promise<TResponse> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });
  await throwIfNotOk(res);
  return res.json();
}

/**
 * Makes a POST request with multipart/form-data (for file uploads).
 */
export async function postMultipart<TResponse>(
  url: string,
  formData: FormData
): Promise<TResponse> {
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  await throwIfNotOk(res);
  return res.json();
}
