// shared/lib/useNav.ts

import { createMemo } from "solid-js";
import { useNavData, useChannelTabs } from "../store/nav-store";
import { useAuth } from "../store/auth-store";
import { getModule } from "../lib/module-registry";
import type { NavItemDef } from "../types/module.types";
import type { NavApp, NavActions, NavChannelTab } from "../lib/nav-api";
import { useI18n } from "@/i18n";
import { useViewerRole } from "../store/site-config";
import type { ViewerRole } from "../store/site-config";
type ActionMeta = {
  label: string;
  icon: string;
  context: NavItemDef["context"];
};
// ── Bootstrap Icon → internal icon token ─────────────────────────────────────

const BI_TO_ICON: Record<string, string> = {
  house: "home",
  "grid-3x3": "grid",
  "person-circle": "dashboard",
  envelope: "mail",
  image: "image",
  folder: "folder",
  "calendar-date": "calendar",
  "chat-text": "chat",
  bookmark: "bookmark",
  newspaper: "article",
  cart: "cart",
  question: "help",
  "question-lg": "help",
  "layout-text-sidebar": "webpages",
  "pencil-square": "wiki",
  people: "connections",
  "diagram-3": "directory",
  globe: "public",
  "file-lock": "groups",
  "columns-gap": "pdl",
};

function biToIcon(biName: string): string {
  return BI_TO_ICON[biName] ?? biName;
}

// ── Hubzilla app name → nav i18n key ─────────────────────────────────────────

const APP_NAME_TO_KEY: Record<string, string> = {
  Network: "network",
  Photos: "photos",
  Calendar: "calendar",
  Cart: "cart",
  Chatrooms: "chat",
  HQ: "hq",
  Articles: "articles",
  Webpages: "webpages",
  Wiki: "wiki",
  Files: "files",
  Help: "help",
  Directory: "directory",
  Channel: "channel",
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

function moduleSegment(url: string): string {
  return urlToPath(url).split("/").filter(Boolean)[0] ?? "";
}

// ── Pinned app → NavItemDef ───────────────────────────────────────────────────

function appToNavItem(
  app: NavApp,
  t: ReturnType<typeof useI18n>["t"],
): NavItemDef {
  const path = urlToPath(app.url);
  const segment = moduleSegment(app.url);
  const mod = getModule(segment);
  const icon = biToIcon(app.bi_icon);
  const i18nKey = APP_NAME_TO_KEY[app.name];

  return {
    label: i18nKey ? t(`nav.${i18nKey}` as any) : app.label,
    icon: mod?.navItem.icon ?? icon,
    href: app.url,
    path,
    context: mod?.navItem.context ?? "all",
  };
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
  const navData = useNavData();
  const auth = useAuth();
  const { t } = useI18n();
  const tabs = useChannelTabs(subjectNick);

  return createMemo((): NavItemDef[] => {
    const isOwnChannel = subjectNick() && auth()?.nick === subjectNick();
    // Channel page — tabs take over the sidebar regardless of viewer role
    if (subjectNick() && !isOwnChannel) {
      if (tabs.loading) return [];
      return (tabs() ?? []).map(tabToNavItem);
    }

    // Non-channel page — show pinned apps
    if (!auth() || navData.loading) return [];
    const data = navData();
    const viewer = data?.viewer;
    if (!data || !viewer) return [];

    const baseurl = viewer.baseurl ?? "";

    const items: NavItemDef[] = data.pinned.map((app) => {
      const url = app.url
        .split(",")[0]
        .trim()
        .replace(/\$baseurl/g, baseurl);
      return appToNavItem({ ...app, url }, t);
    });
    const featured = (data.featured ?? []).map((app) => {
      const url = app.url
        .split(",")[0]
        .trim()
        .replace(/\$baseurl/g, baseurl);
      return appToNavItem({ ...app, url }, t);
    });
    const pinnedPaths = new Set(items.map((i) => i.path));
    const featuredNew = featured.filter((i) => !pinnedPaths.has(i.path));
    // Admin item appended if not already in pinned
    if (viewer.is_admin) {
      const hasAdmin = items.some((i) => {
        const h = typeof i.href === "string" ? i.href : i.href();
        return h.includes("/admin");
      });
      if (!hasAdmin) {
        const adminMod = getModule("admin");
        if (adminMod) items.push({ ...adminMod.navItem });
      }
    }
    return [...items, ...featuredNew];
  });
}
// ── useNavActionItems ─────────────────────────────────────────────────────────

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
  const { t } = useI18n();
  const viewerRole = useViewerRole();

  return createMemo((): NavItemDef[] => {
    const actions = navData()?.actions as NavActions | undefined;
    if (!actions) return [];

    const role = viewerRole();
    const ACTION_META: Record<ActionKey, ActionMeta> = {
      profile: {
        label: t("nav.profile"),
        icon: "person",
        context: ["owner", "local"],
      },
      profiles: {
        label: t("nav.edit_profile"),
        icon: "edit",
        context: ["owner", "local"],
      },
      settings: {
        label: t("nav.settings"),
        icon: "settings",
        context: ["owner", "local"],
      },
      manage: {
        label: t("nav.channels"),
        icon: "manage",
        context: ["owner", "local"],
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
    return ACTION_ORDER.filter((key) => !!actions[key])
      .map((key): NavItemDef => {
        const meta = ACTION_META[key];
        const href = actions[key] as string;
        return {
          label: meta.label,
          icon: meta.icon,
          href,
          path: urlToPath(href),
          context: meta.context,
        };
      })
      .filter((item) => matchesRole(item.context, role));
  });
}
