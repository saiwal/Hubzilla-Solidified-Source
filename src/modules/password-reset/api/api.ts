export interface ResetTokenState {
  valid: boolean;
}

export async function fetchPasswordResetToken(): Promise<string> {
  const res = await fetch("/spa/password-reset", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load form");
  const json = await res.json();
  return json.data?.token ?? "";
}

export async function requestPasswordReset(email: string, token: string): Promise<void> {
  const res = await fetch("/spa/password-reset", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, token }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message ?? "Request failed");
  }
}

export async function fetchResetTokenState(token: string): Promise<ResetTokenState> {
  const res = await fetch(`/spa/password-reset/${encodeURIComponent(token)}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Invalid reset link");
  return json.data as ResetTokenState;
}

export async function confirmPasswordReset(
  token: string,
  password: string,
  password2: string,
): Promise<void> {
  const res = await fetch(`/spa/password-reset/${encodeURIComponent(token)}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, password2 }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message ?? "Password reset failed");
  }
}
