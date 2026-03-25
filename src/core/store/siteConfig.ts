import { createSignal } from "solid-js";
import { moduleGet } from "../api/client";
import { buildNav } from "../nav/buildNav";
import type { NavItemConfig } from "../../app/layout/nav.config";

export const [navItems, setNavItems] = createSignal<NavItemConfig[]>([]);
export interface SiteInfo {
  site_name: string;
  banner: string;         // HTML banner string
  logo: string;           // URL
  description: string;
  register_policy: number;
  openid_provider: boolean;
  // add more as needed
}

export interface PConfig {
  // per-user prefs — keyed by app/key
  [app: string]: Record<string, string | number | boolean>;
}

const [pconfig, setPconfig]   = createSignal<PConfig>({});
const [configLoaded, setConfigLoaded] = createSignal(false);

export async function loadSiteConfig() {
  if (configLoaded()) return;
  try {
    const [pc] = await Promise.all([
      moduleGet<PConfig>("pconfig?format=json").catch(() => ({})), // needs auth, may 401
    ]);
    setPconfig(pc);
		setNavItems();
  } catch (err) {
    console.error("Failed to load site config", err);
  } finally {
    setConfigLoaded(true);
  }
}

export { pconfig, configLoaded };
