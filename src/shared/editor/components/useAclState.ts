/**
 * useAclState.ts
 * Shared ACL-selection state (mode + allow/deny entry sets) for composers
 * that render an <AclPicker>. Owns interaction state only — each composer
 * still builds its own request payload shape from the accessors here (Post's
 * JSON, Article's dual FormData-create/JSON-edit, Webpage's JSON).
 */

import { createSignal } from "solid-js";
import { entryKey, type AclMode, type AclEntry } from "./AclPicker";

export interface AclStateOptions {
  mode?: AclMode;
  allowEntries?: Iterable<string>;
  denyEntries?: Iterable<string>;
}

export interface AclState {
  mode: () => AclMode;
  setMode: (m: AclMode) => void;
  allowEntries: () => Set<string>;
  denyEntries: () => Set<string>;
  toggleEntry: (entry: AclEntry, list: "allow" | "deny") => void;
  clearEntries: () => void;
  /** Resets mode to its initial value and clears entries. */
  reset: () => void;
}

export function useAclState(initial?: AclStateOptions): AclState {
  const initialMode = initial?.mode ?? "connections";
  const [mode, setMode] = createSignal<AclMode>(initialMode);
  const [allowEntries, setAllowEntries] = createSignal<Set<string>>(
    new Set<string>(initial?.allowEntries),
  );
  const [denyEntries, setDenyEntries] = createSignal<Set<string>>(
    new Set<string>(initial?.denyEntries),
  );

  function toggleEntry(entry: AclEntry, list: "allow" | "deny") {
    const key = entryKey(entry);
    const setSet = list === "allow" ? setAllowEntries : setDenyEntries;
    const setOther = list === "allow" ? setDenyEntries : setAllowEntries;
    setSet((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setOther((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function clearEntries() {
    setAllowEntries(new Set<string>());
    setDenyEntries(new Set<string>());
  }

  function reset() {
    setMode(initialMode);
    clearEntries();
  }

  return { mode, setMode, allowEntries, denyEntries, toggleEntry, clearEntries, reset };
}

/** Splits "{type}:{xid}" keys into contact/group id arrays for building a request payload. */
export function splitAclEntries(entries: Set<string>): {
  contactIds: string[];
  groupIds: string[];
} {
  const contactIds: string[] = [];
  const groupIds: string[] = [];
  for (const key of entries) {
    const [type, ...rest] = key.split(":");
    const xid = rest.join(":");
    if (type === "c") contactIds.push(xid);
    if (type === "g") groupIds.push(xid);
  }
  return { contactIds, groupIds };
}
