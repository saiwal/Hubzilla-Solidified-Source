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

  const nick = data.channel_nick ?? "";
  const uid = Number(data.uid ?? 0);
  const isLocal = Boolean(data.is_local);

  return {
    isLocal,
    isLoggedIn: nick !== "",   // remote visitors have a nick too
    nick,
    uid,
  };
}

// Singleton resource — fetched once at boot, shared across the app
const [authState] = createResource<AuthState>(fetchAuthState, {
  initialValue: ANONYMOUS,
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
