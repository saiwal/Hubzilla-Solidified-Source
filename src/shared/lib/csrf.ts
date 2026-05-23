const TOKEN_TTL_MS = 30 * 60 * 1000;

let tokenPromise: Promise<string> | null = null;
let tokenFetchedAt = 0;

export function getCsrfToken(): Promise<string> {
  if (tokenPromise && Date.now() - tokenFetchedAt > TOKEN_TTL_MS) {
    tokenPromise = null;
  }
  if (!tokenPromise) {
    tokenFetchedAt = Date.now();
    tokenPromise = fetchToken().catch((err) => {
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
  tokenFetchedAt = 0;
}
