import { createMemo } from "solid-js";
import { pconfig } from "../../core/store/siteConfig";
import { mainNav, type NavItemConfig } from "./nav.config";

function resolveHref(href: string, cfg: Record<string, unknown>): string {
  return href.replace(/:nick/g, String(cfg.channel_nick ?? ""));
}

export function useNav(): () => NavItemConfig[] {
  return createMemo(() => {
    const cfg = pconfig();
    const features = (cfg.feature ?? {}) as Record<string, string | number | boolean>;

    return mainNav
      .filter((item) => {
        if (item.featureKey) {
          const val = features[item.featureKey];
          if (!val || val === "0") return false;
        }
        if (item.pconfigGate) {
          const { app, key } = item.pconfigGate;
          const appCfg = (cfg[app] ?? {}) as Record<string, string | number | boolean>;
          const val = appCfg[key];
          if (!val || val === "0") return false;
        }
        return true;
      })
      .map((item) =>
        item.dynamicHref
          ? { ...item, href: resolveHref(item.href, cfg as Record<string, unknown>) }
          : item
      );
  });
}
