export async function fetchLoginToken(): Promise<string> {
  const res = await fetch("/api/login", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load login token");
  const json = await res.json();
  return json.data?.token ?? "";
}

export async function submitLogin(
  username: string,
  password: string,
  token: string,
): Promise<{ nick: string }> {
  const res = await fetch("/api/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, token }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error?.message ?? "Login failed");
  }

  return json.data as { nick: string };
}

// Resolves the remote hub's OWA handshake URL; `dest` is the path on this
// site the visitor should land on after authenticating.
export async function submitRmagic(
  address: string,
  dest: string,
): Promise<string> {
  const res = await fetch("/api/rmagic", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, dest }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error?.message ?? "Remote login failed");
  }

  return json.data.url as string;
}
