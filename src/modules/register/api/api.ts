export interface RegisterConfig {
  policy: number;
  closed: boolean;
  invite_only: boolean;
  invite_also: boolean;
  auto_channel_create: boolean;
  verify_email: boolean;
  tos_url: string;
  min_age: number;
  no_age_restriction: boolean;
  enable_tos: boolean;
  register_text: string;
  site_name: string;
  nickhub: string;
  token: string;
}

export interface RegisterPayload {
  token: string;
  email?: string;
  password: string;
  password2: string;
  name?: string;
  nickname?: string;
  tos: boolean;
  invite_code?: string;
  register_msg?: string;
}

export type RegisterResult =
  | { next: "complete"; nick: string }
  | { next: "check_email"; regate_url: string }
  | { next: "pending_approval" };

export interface RegateState {
  type: "e" | "a" | "i";
  email: string;
  expired: boolean;
  pending_approval: boolean;
}

export type RegateResult =
  | { next: "complete"; nick: string }
  | { next: "pending_approval" };

export async function fetchRegateState(token: string): Promise<RegateState> {
  const res = await fetch(`/api/regate/${encodeURIComponent(token)}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Invalid verification link");
  return json.data as RegateState;
}

export async function submitRegate(token: string, pin: string): Promise<RegateResult> {
  const res = await fetch(`/api/regate/${encodeURIComponent(token)}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Verification failed");
  return json.data as RegateResult;
}

export async function fetchRegisterConfig(): Promise<RegisterConfig> {
  const res = await fetch("/api/register", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load registration form");
  const json = await res.json();
  return json.data as RegisterConfig;
}

export async function submitRegister(payload: RegisterPayload): Promise<RegisterResult> {
  const res = await fetch("/api/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message ?? "Registration failed");
  }
  return json.data as RegisterResult;
}
