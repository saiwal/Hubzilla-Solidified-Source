import { getCsrfToken, resetCsrfToken } from './csrf';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isCsrfError(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const msg = (body as { error?: { message?: string; code?: string } }).error?.message ?? '';
  const code = (body as { error?: { message?: string; code?: string } }).error?.code ?? '';
  return code === 'csrf_invalid' || msg === 'Invalid CSRF token';
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const isMutating = MUTATING.has(method);

  const buildHeaders = async (): Promise<Record<string, string>> => ({
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
    ...(isMutating ? { 'X-CSRF-Token': await getCsrfToken() } : {}),
  });

  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: await buildHeaders(),
  });

  if (isMutating && res.status === 403) {
    const body = await res.clone().json().catch(() => null);
    if (isCsrfError(body)) {
      resetCsrfToken();
      // Retry once with a fresh token
      return fetch(path, {
        ...init,
        credentials: 'include',
        headers: await buildHeaders(),
      });
    }
  }

  return res;
}
