import { getNavItems } from "../../module-registry";

// now just a thin wrapper — nav is driven by registered modules
export function useNav() {
  return getNavItems();
}
