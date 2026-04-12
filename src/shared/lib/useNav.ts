// shared/lib/useNav.ts

import { createMemo } from "solid-js";
import { useNavData } from "../store/nav-store";
import { useAuth } from "../store/auth-store";
import { getModule } from "../lib/module-registry";
import type { NavItemDef } from "../types/module.types";
import type { NavApp, NavActions } from "../lib/nav-api";

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

function appToNavItem(app: NavApp): NavItemDef {
  const path = urlToPath(app.url);
  const segment = moduleSegment(app.url);
  const mod = getModule(segment);
  const icon = biToIcon(app.bi_icon);

  return {
    label: app.label,
    icon: mod?.navItem.icon ?? icon,
    href: app.url,
    path,
    context: mod?.navItem.context ?? "all",
  };
}

// ── useNav ────────────────────────────────────────────────────────────────────
// Primary sidebar nav built from the server-ordered pinned list.

export function useNav(): () => NavItemDef[] {
  const navData = useNavData();
  const auth = useAuth();

  return createMemo((): NavItemDef[] => {
    if (!auth() || navData.loading) return [];

    const data = navData();
    const viewer = data?.viewer;
    if (!data || !viewer) return [];
    const baseurl = data.viewer?.baseurl;
    const allApps = [...data.pinned, ...data.featured];

    const items: NavItemDef[] = allApps.flatMap((app) => {
      const urls = app.url
        .split(",")
        .map((u) => u.trim().replace(/\$baseurl/g, baseurl));

      return urls.map((url) => appToNavItem({ ...app, url }));
    });
    // Append admin item if viewer is admin and it is not already pinned
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

const ACTION_META: Record<
  string,
  { label: string; icon: string; context: NavItemDef["context"] }
> = {
  profile: { label: "Profile", icon: "person", context: ["owner", "local"] },
  profiles: {
    label: "Edit Profile",
    icon: "edit",
    context: ["owner", "local"],
  },
  settings: {
    label: "Settings",
    icon: "settings",
    context: ["owner", "local"],
  },
  manage: { label: "Channels", icon: "manage", context: ["owner", "local"] },
  logout: {
    label: "Logout",
    icon: "logout",
    context: ["owner", "local", "remote"],
  },
  login: { label: "Login", icon: "login", context: "anonymous" },
  remote_login: { label: "Remote Login", icon: "remote", context: "anonymous" },
  register: { label: "Register", icon: "register", context: "anonymous" },
};

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

export function useNavActionItems(): () => NavItemDef[] {
  const navData = useNavData();

  return createMemo((): NavItemDef[] => {
    const actions = navData()?.actions as NavActions | undefined;
    if (!actions) return [];

    return ACTION_ORDER.filter((key) => !!actions[key]).map(
      (key): NavItemDef => {
        const meta = ACTION_META[key];
        const href = actions[key] as string;
        return {
          label: meta.label,
          icon: meta.icon,
          href,
          path: urlToPath(href),
          context: meta.context,
        };
      },
    );
  });
}
