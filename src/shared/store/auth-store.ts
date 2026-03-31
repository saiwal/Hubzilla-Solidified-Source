import { createResource } from "solid-js";

export type AuthState = {
  isLocal: boolean;       // true = native logged-in user
  isLoggedIn: boolean;    // true = any authenticated user (local or remote)
  nick: string;           // channel nick, "" if anonymous
  uid: number;            // local channel id, 0 for visitors/anonymous
};

const ANONYMOUS: AuthState = {
  isLocal: false,
  isLoggedIn: false,
  nick: "",
  uid: 0,
};

async function fetchAuthState(): Promise<AuthState> {
  const res = await fetch("/pconfig?format=json");
  if (!res.ok) return ANONYMOUS;
  const data = await res.json();
  if (data.error) return ANONYMOUS;

  const nick = data.channel ?? "";
  const uid = Number(data.uid ?? 0);
  // No is_local field — if uid > 0 and channel is set, it's a local user
  const isLocal = uid > 0 && nick !== "";

  return {
    isLocal,
    isLoggedIn: nick !== "",
    nick,
    uid,
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
