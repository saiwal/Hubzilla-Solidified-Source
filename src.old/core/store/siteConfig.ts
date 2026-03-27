import { createSignal } from "solid-js";
import { moduleGet } from "../api/client";

type AppConfigMap = Record<string, Record<string, string | number | boolean>>;

export type PConfig = AppConfigMap & {
  uid?: number;
  channel_nick?: string;
  is_local?: boolean;
};

const [pconfig, setPconfig]   = createSignal<PConfig>({});
const [configLoaded, setConfigLoaded] = createSignal(false);

export async function loadSiteConfig() {
  if (configLoaded()) return;
  try {
    const [pc] = await Promise.all([
      moduleGet<PConfig>("pconfig?format=json").catch(() => ({})), // needs auth, may 401
    ]);
    setPconfig(pc);
  } catch (err) {
    console.error("Failed to load site config", err);
  } finally {
    setConfigLoaded(true);
  }
}

export { pconfig, configLoaded };
