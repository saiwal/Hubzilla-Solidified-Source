const BASE = "/api/z/1.0";

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE}/${endpoint}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export async function moduleGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`/${endpoint}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Module error: ${res.status}`);
  return res.json();
}

export async function modulePost<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`/${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Module error: ${res.status}`);
  return res.json();
}
