import { createMemo } from "solid-js";
import { getNavItems } from "@/module-registry";
import { useViewerRole, type ViewerRole } from "../store/site-config";
import { useAuth } from "../store/auth-store";
import type { NavItemDef } from "../types/module.types";

function isVisible(item: NavItemDef, role: ViewerRole): boolean {
  const ctx = item.context ?? "local";
  const allowed = Array.isArray(ctx) ? ctx : [ctx];
  if (allowed.includes("all")) return true;
  return allowed.includes(role);
}

export function useNav() {
  const auth = useAuth();
  const role = useViewerRole();
  const allItems = getNavItems();

  return createMemo(() => {
    const a = auth();
    if (!a) return []; // still loading
    return allItems().filter((item) => isVisible(item, role()));
  });
}
