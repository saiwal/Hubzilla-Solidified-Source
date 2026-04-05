import { createMemo } from "solid-js";
import { getNavItems } from "@/shared/lib/module-registry";
import { useViewerRole, useIsAdmin } from "@/shared/store/site-config";

export function useNav() {
  const role = useViewerRole();
  const isAdmin = useIsAdmin();
  const allItems = getNavItems();
  return createMemo(() =>
    allItems().filter((item) => {
      if (!item.context) return true;
      const ctx = Array.isArray(item.context) ? item.context : [item.context];
      if (ctx.includes("admin")) return isAdmin();
      return ctx.includes(role()) || ctx.includes("all");
    }),
  );
}
