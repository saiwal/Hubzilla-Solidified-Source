// shared/lib/useNav.ts

import { createMemo } from "solid-js";
import {
  useNavData,
  useChannelNav,
  usePinnedApps,
  useFeaturedApps,
  useInstalledApps,
} from "../store/nav-store";

import { isAdmin, useAuth } from "../store/auth-store";
import type { NavItemDef } from "../types/module.types";
import type { NavActions, NavChannelTab, NavApp } from "../lib/nav-api";
import { biToNavIcon } from "../lib/nav-api";
import { getRoutes } from "./module-registry";
import { useI18n } from "@/i18n";
import { useViewerRole } from "../store/site-config";
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

function appToNavItem(app: NavApp): NavItemDef {
  const href = toSpaHref(app.url);
  return {
    label: app.label,
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
  const auth = useAuth();
  const channelNav = useChannelNav(subjectNick);
  const viewerRole = useViewerRole();
  const pinnedApps = usePinnedApps();
  const featuredApps = useFeaturedApps();
  const installedApps = useInstalledApps();

  return createMemo((): NavItemDef[] => {
    const role = viewerRole();
    const nick = subjectNick();
    const isOwnChannel = !!nick && auth()?.nick === nick;
    const spaRoots = buildSpaRoots();

    // Visiting someone else's channel (any role) → channel tabs + global pinned apps
    // "global pinned" = personal pinned for logged-in users; Directory/Help/Network for anonymous
    if (nick && !isOwnChannel) {
      if (channelNav.loading) return [];
      const tabs = (channelNav()?.channel_tabs ?? []).map(tabToNavItem);
      const sysApps = pinnedApps()
        .filter((a) => isSpaApp(a, spaRoots))
        .map(appToNavItem);
      return dedupByHref([...tabs, ...sysApps]);
    }

    // Anonymous not on a channel → curated public pinned apps (Directory, Help, Network)
    if (role === "anonymous") {
      return pinnedApps()
        .filter((a) => isSpaApp(a, spaRoots))
        .map(appToNavItem);
    }

    // Logged-in user on own pages → pinned + featured filtered by installed apps
    const installed = installedApps();
    const pinned = pinnedApps().filter((a) => isSpaApp(a, spaRoots));
    const pinnedUrls = new Set(pinned.map((a) => toSpaHref(a.url)));
    const extraFeatured = featuredApps()
      .filter(
        (a) =>
          isSpaApp(a, spaRoots) &&
          !pinnedUrls.has(toSpaHref(a.url)) &&
          (installed.size === 0 || installed.has(a.name)),
      )
      .map(appToNavItem);
    return dedupByHref([...pinned.map(appToNavItem), ...extraFeatured]);
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
