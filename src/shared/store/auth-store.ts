import { createResource } from "solid-js";

export type AuthState = {
  isLocal: boolean; // true = native logged-in user
  isLoggedIn: boolean; // true = any authenticated user (local or remote)
  isAdmin: boolean; // true = is administrator
  nick: string; // channel nick, "" if anonymous
  uid: number; // local channel id, 0 for visitors/anonymous
  pageSize: number;
	updateInterval: number;
};

const ANONYMOUS: AuthState = {
  isLocal: false,
  isLoggedIn: false,
  isAdmin: false,
  nick: "",
  uid: 0,
  pageSize: 10,
	updateInterval: 60,
};

async function fetchAuthState(): Promise<AuthState> {
  const res = await fetch("/pconfig?format=json");
  if (!res.ok) return ANONYMOUS;
  const data = await res.json();
  if (data.error) return ANONYMOUS;

  const isAdmin = data.is_admin ?? false;
  const nick = data.channel ?? "";
  const uid = Number(data.uid ?? 0);
  // No is_local field — if uid > 0 and channel is set, it's a local user
  const isLocal = uid > 0 && nick !== "";

  return {
    isLocal,
    isLoggedIn: nick !== "",
    isAdmin,
    nick,
    uid,
    pageSize: parseInt(data.system?.itemspage ?? "10", 10),
		updateInterval: parseInt(data.system?.update_interval ?? "60000", 10),

  };
}
// Singleton resource — fetched once at boot, shared across the app
const [authState] = createResource<AuthState>(fetchAuthState, {
  // initialValue: ANONYMOUS,
});

export function useAuth() {
  return authState;
}

// Convenience derived helpers
export function isLocalUser() {
  return authState()?.isLocal ?? false;
}

export function isLoggedIn() {
  return authState()?.isLoggedIn ?? false;
}

export function currentNick() {
  return authState()?.nick ?? "";
}
export function pageSize(): number {
  return authState()?.pageSize ?? 10;
}
export function updateInterval(): number{
	return authState()?.updateInterval ?? 60000;
}
