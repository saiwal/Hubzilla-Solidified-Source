// shared/store/nav-order.ts
//
// Persists the user's preferred nav item order to localStorage.
// The order is a list of app names (NavApp.name) in display order.

import { createSignal } from "solid-js";
import type { NavApp } from "../lib/nav-api";

const STORAGE_KEY = "hz-nav-order";

function load(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

const [navOrder, _setNavOrder] = createSignal<string[]>(load());

export { navOrder };

export function setNavOrder(names: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  _setNavOrder([...names]);
}

// Sort apps by stored order; apps not in the list are appended at the end.
// Calling navOrder() inside creates a reactive dependency when used in a memo.
export function applyNavOrder(apps: NavApp[]): NavApp[] {
  const order = navOrder();
  if (order.length === 0) return apps;
  const idx = new Map(order.map((name, i) => [name, i]));
  return [...apps].sort((a, b) => {
    const ia = idx.get(a.name) ?? order.length;
    const ib = idx.get(b.name) ?? order.length;
    return ia - ib;
  });
}
