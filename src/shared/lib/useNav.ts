// shared/lib/useNav.ts

import { createMemo } from "solid-js";
import {
  useNavData,
  useChannelNav,
  usePinnedApps,
  useFeaturedApps,
  useSystemApps,
  useInstalledApps,
} from "../store/nav-store";

import { isAdmin } from "../store/auth-store";
import type { NavItemDef } from "../types/module.types";
import type { NavActions, NavChannelTab, NavApp } from "../lib/nav-api";
import { biToNavIcon } from "../lib/nav-api";
import { getNavItems, getRoutes } from "./module-registry";
import { useI18n } from "@/i18n";
import { useViewerRole } from "../store/site-config";
import { applyNavOrder } from "../store/nav-order";
import type { ViewerRole } from "../store/site-config";

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

function toSpaHref(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.origin === window.location.origin) return u.pathname + u.search;
  } catch {
    // relative or malformed — use as-is
  }
  return url;
}

function tabToNavItem(tab: NavChannelTab): NavItemDef {
  const href = toSpaHref(tab.url);
  return {
    label: tab.label,
    icon: tab.icon,
    href,
    path: urlToPath(href),
  };
}

function appToNavItem(app: NavApp, moduleLabelMap: Map<string, NavItemDef["label"]>): NavItemDef {
  const href = toSpaHref(app.url);
  const root = href.split("/").filter(Boolean)[0] ?? "";
  const label = moduleLabelMap.get(root) ?? app.label;
  return {
    label,
    icon: biToNavIcon(app.bi_icon),
    href,
    path: urlToPath(href),
  };
}

// Build a set of first-segment path roots from registered SPA routes
// e.g. "/photos/:nick" → "photos", "/page/:nick/*path" → "page"
function buildSpaRoots(): Set<string> {
  return new Set(
    getRoutes()().map((r) => r.path.split("/").filter(Boolean)[0] ?? ""),
  );
}

// Map path root → registered module label so server-provided app names are
// replaced with the i18n-aware label from the module registration.
// e.g. "network" → () => t("nav.network")
function buildModuleLabelMap(): Map<string, NavItemDef["label"]> {
  const map = new Map<string, NavItemDef["label"]>();
  for (const item of getNavItems()()) {
    const root = item.path.split("/").filter(Boolean)[0];
    if (root) map.set(root, item.label);
  }
  return map;
}

function isSpaApp(app: NavApp, spaRoots: Set<string>): boolean {
  const href = toSpaHref(app.url);
  if (!href.startsWith("/")) return false;
  const root = href.split("/").filter(Boolean)[0] ?? "";
  return spaRoots.has(root);
}

function dedupByHref(items: NavItemDef[]): NavItemDef[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = typeof item.href === "function" ? item.href() : item.href;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── useNav ────────────────────────────────────────────────────────────────────
export function useNav(subjectNick: () => string): () => NavItemDef[] {
  const channelNav = useChannelNav(subjectNick);
  const pinnedApps = usePinnedApps();
  const featuredApps = useFeaturedApps();
  const systemApps = useSystemApps();
  const installedApps = useInstalledApps();
  const viewerRole = useViewerRole();
  const { t } = useI18n();

  return createMemo((): NavItemDef[] => {
    const role = viewerRole();
    const nick = subjectNick();
    const spaRoots = buildSpaRoots();
    const moduleLabelMap = buildModuleLabelMap();

    // Logged-in local user visiting someone else's channel → channel tabs only.
    // System apps are excluded because they carry the viewer's own nick in
    // their URLs and are visually indistinguishable from personal pinned apps.
    if (nick && role === "local") {
      if (channelNav.loading) return [];
      return (channelNav()?.channel_tabs ?? []).map(tabToNavItem);
    }

    // Anonymous or remote visitor on a channel → channel tabs + system apps.
    if (nick && (role === "anonymous" || role === "remote")) {
      if (channelNav.loading) return [];
      const tabs = (channelNav()?.channel_tabs ?? []).map(tabToNavItem);
      const sysApps = systemApps()
        .filter((a) => isSpaApp(a, spaRoots))
        .map((a) => appToNavItem(a, moduleLabelMap));
      return dedupByHref([...tabs, ...sysApps]);
    }

    // Owner in their own context → pinned + installed featured + admin
    if (role === "owner") {
      const installed = installedApps();
      const filteredPinned = pinnedApps().filter((a) => isSpaApp(a, spaRoots));
      const pinnedUrls = new Set(filteredPinned.map((a) => toSpaHref(a.url)));
      const filteredFeatured = featuredApps().filter(
        (a) =>
          isSpaApp(a, spaRoots) &&
          !pinnedUrls.has(toSpaHref(a.url)) &&
          (installed.size === 0 || installed.has(a.name)),
      );
      const items = applyNavOrder([...filteredPinned, ...filteredFeatured])
        .map((a) => appToNavItem(a, moduleLabelMap));

      if (isAdmin())
        items.push({ label: t("nav.admin"), icon: "admin", href: "/admin", path: "/admin" });

      return dedupByHref(items);
    }

    // Visitor (anon/remote) not on a channel → system apps only
    return systemApps()
      .filter((a) => isSpaApp(a, spaRoots))
      .map((a) => appToNavItem(a, moduleLabelMap));
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
    // These actions have SPA routes — use direct paths to avoid a hard reload.
    const SPA_PATHS: Partial<Record<ActionKey, string>> = {
      admin: "/admin",
      settings: "/settings",
      manage: "/manage",
    };

    return ACTION_ORDER.filter((key) => {
      if (key === "admin") return isAdmin();
      if (!actions[key]) return false;
      return matchesRole(ACTION_META[key].context, role);
    }).map((key): NavItemDef => {
      const meta = ACTION_META[key];
      const href = SPA_PATHS[key] ?? (actions[key] as string);
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
