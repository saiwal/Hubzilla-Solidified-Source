// shared/lib/useNav.ts

import { createMemo } from "solid-js";
import { useNavData } from "../store/nav-store";
import { useAuth } from "../store/auth-store";
import { getModule } from "../lib/module-registry";
import type { NavItemDef } from "../types/module.types";
import type { NavApp, NavActions } from "../lib/nav-api";
import { useI18n } from "@/i18n";

// ── Bootstrap Icon → internal icon token ─────────────────────────────────────

const BI_TO_ICON: Record<string, string> = {
  house:                 "home",
  "grid-3x3":            "grid",
  "person-circle":       "dashboard",
  envelope:              "mail",
  image:                 "image",
  folder:                "folder",
  "calendar-date":       "calendar",
  "chat-text":           "chat",
  bookmark:              "bookmark",
  newspaper:             "article",
  cart:                  "cart",
  question:              "help",
  "question-lg":         "help",
  "layout-text-sidebar": "webpages",
  "pencil-square":       "wiki",
  people:                "connections",
  "diagram-3":           "directory",
  globe:                 "public",
  "file-lock":           "groups",
  "columns-gap":         "pdl",
};

function biToIcon(biName: string): string {
  return BI_TO_ICON[biName] ?? biName;
}

// ── Hubzilla app name → nav i18n key ─────────────────────────────────────────
// Stable app names from Hubzilla mapped to keys in RawDictionary["nav"].

const APP_NAME_TO_KEY: Record<string, string> = {
  "Network":   "network",
  "Photos":    "photos",
  "Calendar":  "calendar",
  "Cart":      "cart",
  "Chatrooms": "chat",
  "HQ":        "hq",
  "Articles":  "articles",
  "Webpages":  "webpages",
  "Wiki":      "wiki",
  "Files":     "files",
  "Help":      "help",
  "Directory": "directory",
  "Channel":   "channel",
};

// ── URL helpers ───────────────────────────────────────────────────────────────

function urlToPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.startsWith("/") ? url : "/" + url;
  }
}

function moduleSegment(url: string): string {
  return urlToPath(url).split("/").filter(Boolean)[0] ?? "";
}

// ── Pinned app → NavItemDef ───────────────────────────────────────────────────
function appToNavItem(
  app: NavApp,
  t: ReturnType<typeof useI18n>["t"],
): NavItemDef {
  const path    = urlToPath(app.url);
  const segment = moduleSegment(app.url);
  const mod     = getModule(segment);
  const icon    = biToIcon(app.bi_icon);
  const i18nKey = APP_NAME_TO_KEY[app.name];

  return {
    label:   i18nKey ? t(`nav.${i18nKey}` as any) : app.label,
    icon:    mod?.navItem.icon ?? icon,
    href:    app.url,
    path,
    context: mod?.navItem.context ?? "all",
  };
}

// ── useNav ────────────────────────────────────────────────────────────────────
// Primary sidebar nav — pinned apps only (user-ordered, server-filtered).

export function useNav(): () => NavItemDef[] {
  const navData = useNavData();
  const auth    = useAuth();
  const { t }   = useI18n();

  return createMemo((): NavItemDef[] => {
    if (!auth() || navData.loading) return [];

    const data   = navData();
    const viewer = data?.viewer;
    if (!data || !viewer) return [];

    const baseurl = viewer.baseurl ?? "";

    // Pinned only — take primary URL (before comma), substitute $baseurl
    const items: NavItemDef[] = data.pinned.map((app) => {
      const primaryUrl = app.url
        .split(",")[0]
        .trim()
        .replace(/\$baseurl/g, baseurl);
      return appToNavItem({ ...app, url: primaryUrl }, t);
    });

    // Append admin item if viewer is admin and not already in pinned list
    if (viewer.is_admin) {
      const hasAdmin = items.some((i) => {
        const h = typeof i.href === "string" ? i.href : i.href();
        return h.includes("/admin");
      });
      if (!hasAdmin) {
        const adminMod = getModule("admin");
        if (adminMod) items.push({ ...adminMod.navItem, context: "admin" });
      }
    }

    return items;
  });
}

// ── useNavActionItems ─────────────────────────────────────────────────────────
// Secondary sidebar section: logout, settings, login, etc.
// Render these below the pinned nav separated by a divider in Layout.tsx.

const ACTION_ORDER = [
  "profile",
  "profiles",
  "settings",
  "manage",
  "logout",
  "login",
  "remote_login",
  "register",
] as const;

type ActionKey = (typeof ACTION_ORDER)[number];

export function useNavActionItems(): () => NavItemDef[] {
  const navData = useNavData();
  const { t }   = useI18n();

  return createMemo((): NavItemDef[] => {
    const actions = navData()?.actions as NavActions | undefined;
    if (!actions) return [];

    const ACTION_META: Record<
      ActionKey,
      { label: string; icon: string; context: NavItemDef["context"] }
    > = {
      profile:      { label: t("nav.profile"),      icon: "person",   context: ["owner", "local"] },
      profiles:     { label: t("nav.edit_profile"), icon: "edit",     context: ["owner", "local"] },
      settings:     { label: t("nav.settings"),     icon: "settings", context: ["owner", "local"] },
      manage:       { label: t("nav.channels"),     icon: "manage",   context: ["owner", "local"] },
      logout:       { label: t("nav.logout"),       icon: "logout",   context: ["owner", "local", "remote"] },
      login:        { label: t("nav.login"),        icon: "login",    context: "anonymous" },
      remote_login: { label: t("nav.remote_login"), icon: "remote",   context: "anonymous" },
      register:     { label: t("nav.register"),     icon: "register", context: "anonymous" },
    };

    return ACTION_ORDER.filter((key) => !!actions[key]).map(
      (key): NavItemDef => {
        const meta = ACTION_META[key];
        const href = actions[key] as string;
        return {
          label:   meta.label,
          icon:    meta.icon,
          href,
          path:    urlToPath(href),
          context: meta.context,
        };
      },
    );
  });
}
