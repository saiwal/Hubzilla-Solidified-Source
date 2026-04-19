import { getCsrfToken, resetCsrfToken } from './csrf';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };

  if (MUTATING.has(method)) {
    headers['X-CSRF-Token'] = await getCsrfToken();
  }

  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  });

  // Token expired or invalidated — reset and let caller retry
  if (res.status === 403) {
    const body = await res.clone().json().catch(() => null);
    if (body?.error?.message === 'Invalid CSRF token') {
      resetCsrfToken();
    }
  }

  return res;
}
