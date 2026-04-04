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
      if (item.context === "admin") return isAdmin();
      return item.context === role() || item.context === "all";
    })
  );
}
