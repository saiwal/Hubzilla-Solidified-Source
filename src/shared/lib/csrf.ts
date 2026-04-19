// Fetched once per session, reused for all mutating requests

let tokenPromise: Promise<string> | null = null;

export function getCsrfToken(): Promise<string> {
  if (!tokenPromise) {
    tokenPromise = fetchToken().catch((err) => {
      // Reset so next call retries
      tokenPromise = null;
      throw err;
    });
  }
  return tokenPromise;
}

async function fetchToken(): Promise<string> {
  const res = await fetch('/api/csrf', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  const { data } = await res.json();
  return data.token as string;
}

export function resetCsrfToken(): void {
  tokenPromise = null;
}
