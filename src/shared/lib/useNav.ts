// shared/lib/useNav.ts

import { createMemo } from "solid-js";
import { useNavData, useChannelTabs } from "../store/nav-store";
import { isAdmin, useAuth } from "../store/auth-store";
import { getAbsorbedApps } from "../lib/module-registry";
import type { NavItemDef } from "../types/module.types";
import type { NavActions, NavApp, NavChannelTab } from "../lib/nav-api";
import { useI18n } from "@/i18n";
import { useViewerRole } from "../store/site-config";
import type { ViewerRole } from "../store/site-config";
import { biToNavIcon } from "../views/NavItem";

type ActionMeta = {
  label: string;
  icon: string;
  context: NavItemDef["context"];
};

// ── Role matching (used by useNavActionItems) ─────────────────────────────────

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

function appToNavItem(app: NavApp): NavItemDef {
  const icon = biToNavIcon(app.bi_icon) || app.name.toLowerCase();
  return {
    label: app.label,
    icon,
    href: app.url,
    path: urlToPath(app.url),
  };
}

function filterAbsorbed(apps: NavApp[]): NavApp[] {
  const absorbed = getAbsorbedApps();
  return absorbed.size === 0 ? apps : apps.filter((a) => !absorbed.has(a.name));
}

function systemApps(featured: NavApp[]): NavItemDef[] {
  return filterAbsorbed(featured).filter((a) => a.requires === "").map(appToNavItem);
}

// ── useNav ────────────────────────────────────────────────────────────────────
export function useNav(subjectNick: () => string): () => NavItemDef[] {
  const auth = useAuth();
  const tabs = useChannelTabs(subjectNick);
  const navData = useNavData();
  const viewerRole = useViewerRole();

  return createMemo((): NavItemDef[] => {
    if (navData.loading) return [];
    const data = navData();
    if (!data) return [];

    const role = viewerRole();
    const isOwnChannel = !!subjectNick() && auth()?.nick === subjectNick();

    // Visiting someone else's channel → channel tabs + public system apps
    if (subjectNick() && !isOwnChannel) {
      const channelTabs = tabs.loading ? [] : (tabs() ?? []).map(tabToNavItem);
      return [...channelTabs, ...systemApps(data.featured)];
    }

    // Logged-in user → pinned first, then featured (deduped, absorbed apps removed)
    if (role !== "anonymous") {
      const seen = new Set(data.pinned.map((a) => a.name));
      const combined = filterAbsorbed([
        ...data.pinned,
        ...data.featured.filter((a) => !seen.has(a.name)),
      ]);
      return combined.map(appToNavItem);
    }

    // Anonymous → public system apps only
    return systemApps(data.featured);
  });
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
