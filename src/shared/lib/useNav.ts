// shared/lib/useNav.ts

import { createMemo } from "solid-js";
import { useNavData, useChannelTabs } from "../store/nav-store";
import { isAdmin, useAuth } from "../store/auth-store";
import { getModule, getRoutes } from "../lib/module-registry";
import type { NavItemDef } from "../types/module.types";
import type { NavActions, NavChannelTab } from "../lib/nav-api";
import { useI18n } from "@/i18n";
import { useViewerRole } from "../store/site-config";
import type { ViewerRole } from "../store/site-config";

type ActionMeta = {
  label: string;
  icon: string;
  context: NavItemDef["context"];
};

// ── Role matching ─────────────────────────────────────────────────────────────

function matchesRole(
  context: NavItemDef["context"],
  role: ViewerRole,
): boolean {
  if (context === "all") return true;
  if (Array.isArray(context)) return (context as string[]).includes(role);
  return context === role;
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function urlToPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.startsWith("/") ? url : "/" + url;
  }
}

function tabToNavItem(tab: NavChannelTab): NavItemDef {
  return {
    label: tab.label,
    icon: tab.icon,
    href: tab.url,
    path: urlToPath(tab.url),
  };
}
// ── useNav ────────────────────────────────────────────────────────────────────
export function useNav(subjectNick: () => string): () => NavItemDef[] {
  // const navData = useNavData();
  const auth = useAuth();
  // const { t } = useI18n();
  const tabs = useChannelTabs(subjectNick);
  const navData = useNavData();

  return createMemo((): NavItemDef[] => {
    const isOwnChannel = subjectNick() && auth()?.nick === subjectNick();
    // Channel page — tabs take over the sidebar regardless of viewer role
    if (subjectNick() && !isOwnChannel) {
      if (tabs.loading) return [];
      return (tabs() ?? []).map(tabToNavItem);
    }
    if (!auth() || navData.loading) return [];
    const data = navData();
    const viewer = data?.viewer;
    if (!data || !viewer) return [];
    const seen = new Set<string>();
    const items: NavItemDef[] = getRoutes()()
      .map((route) => {
        const seg = route.path.split("/").filter(Boolean)[0] ?? "";
        return getModule(seg);
      })
      .filter((mod) => {
        if (!mod || seen.has(mod.id) || mod.navItem.hidden) return false;
        seen.add(mod.id);
        const baseurl = viewer.baseurl ?? "";
        const allApps = [...(data.pinned ?? []), ...(data.featured ?? [])];
        return allApps.some((app) => {
          const url = app.url
            .split(",")[0]
            .trim()
            .replace(/\$baseurl/g, baseurl);
          return moduleSegment(url) === mod.id;
        });
      })
      .map((mod) => ({ ...mod!.navItem }));

    items.sort((a, b) => {
      const labelA = typeof a.label === "function" ? a.label() : a.label;
      const labelB = typeof b.label === "function" ? b.label() : b.label;
      return labelA.localeCompare(labelB);
    });

    return items;
  });
}
function moduleSegment(url: string): string {
  return urlToPath(url).split("/").filter(Boolean)[0] ?? "";
}
// ── useNavActionItems ─────────────────────────────────────────────────────────

const ACTION_ORDER = [
  "admin",
  "settings",
  "manage",
  "navhome",
  "logout",
  "login",
  "remote_login",
  "register",
] as const;

type ActionKey = (typeof ACTION_ORDER)[number];

export function useNavActionItems(): () => NavItemDef[] {
  const navData = useNavData();
  const { t } = useI18n();
  const viewerRole = useViewerRole();
  // const auth = useAuth();
  return createMemo((): NavItemDef[] => {
    const actions = navData()?.actions as NavActions | undefined;
    if (!actions) return [];

    const role = viewerRole();
    const ACTION_META: Record<ActionKey, ActionMeta> = {
      admin: {
        label: t("nav.admin"),
        icon: "admin",
        context: "admin",
      },
      settings: {
        label: t("nav.settings"),
        icon: "settings",
        context: ["owner"],
      },
      manage: {
        label: t("nav.channels"),
        icon: "manage",
        context: ["owner"],
      },
      navhome: {
        label: t("nav.navhome"),
        icon: "home",
        context: ["local", "remote"],
      },
      logout: {
        label: t("nav.logout"),
        icon: "logout",
        context: ["owner", "local", "remote"],
      },
      login: { label: t("nav.login"), icon: "login", context: "anonymous" },
      remote_login: {
        label: t("nav.remote_login"),
        icon: "remote",
        context: "anonymous",
      },
      register: {
        label: t("nav.register"),
        icon: "register",
        context: "anonymous",
      },
    };
    return ACTION_ORDER.filter((key) => {
      if (key === "admin") return isAdmin(); 
      if (!actions[key]) return false;
      return matchesRole(ACTION_META[key].context, role);
    }).map((key): NavItemDef => {
      const meta = ACTION_META[key];
      const href = key === "admin" ? "/admin/" : (actions[key] as string);
      return {
        label: meta.label,
        icon: meta.icon,
        href,
        path: urlToPath(href),
        context: meta.context,
      };
    });
  });
}
