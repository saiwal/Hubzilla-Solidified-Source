import { type Component, lazy, Show } from "solid-js";
import { A, useMatch } from "@solidjs/router";
import { createMediaQuery } from "@solid-primitives/media";
import {
  BiRegularCog,
  BiRegularLock,
  BiRegularBell,
  BiRegularChevronRight,
} from "solid-icons/bi";
import { useI18n } from "@/i18n";

// ── Lazy section views ────────────────────────────────────────────────────────
const DisplaySection = lazy(() => import("./DisplaySection"));
const PrivacySection = lazy(() => import("./PrivacySection"));
const NotificationsSection = lazy(() => import("./NotificationsSection"));

// ── Section registry ──────────────────────────────────────────────────────────
// Each entry drives both the sidebar nav and the mobile list.
// `path` must match the route registered in index.ts.

type SectionDef = {
  id: string;
  path: string; // absolute path used for <A> and useMatch
  label: string;
  Icon: Component;
  View: Component;
};

const SECTIONS: SectionDef[] = [
  { id: "display",       path: "/settings/display",       label: "Display",       Icon: BiRegularCog,  View: DisplaySection },
  { id: "privacy",       path: "/settings/privacy",       label: "Privacy",       Icon: BiRegularLock, View: PrivacySection },
  { id: "notifications", path: "/settings/notifications", label: "Notifications", Icon: BiRegularBell, View: NotificationsSection },
];
 
// ── Shared section heading ────────────────────────────────────────────────────
const SectionHeading: Component<{ label: string }> = (props) => (
  <div class="mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
    <h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
      {props.label}
    </h2>
  </div>
);

// ── Desktop sidebar nav item ──────────────────────────────────────────────────
const NavItem: Component<{ section: SectionDef }> = (props) => {
  // const { t } = useI18n();
  // useMatch returns an accessor; truthy = this route is active
  const active = useMatch(() => props.section.path);

  return (
    <A
      href={props.section.path}
      class={[
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active()
          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-800 dark:hover:text-zinc-200",
      ].join(" ")}
    >
      <span class="w-4 h-4 shrink-0 flex items-center justify-center">
        <props.section.Icon />
      </span>
      <span>{props.section.label}</span>
    </A>
  );
};

// ── Mobile list item ──────────────────────────────────────────────────────────
const MobileListItem: Component<{ section: SectionDef }> = (props) => {
  // const { t } = useI18n();

  return (
    <A
      href={props.section.path}
      class="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
    >
      <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
        <props.section.Icon />
      </span>
      <span class="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {props.section.label}
      </span>
      <BiRegularChevronRight class="w-4 h-4 text-zinc-400" />
    </A>
  );
};

// ── Section outlet ────────────────────────────────────────────────────────────
// Renders whichever section's path matches the current URL.
const SectionOutlet: Component<{ sections: SectionDef[] }> = (props) => {
  return (
    <>
      {props.sections.map((s) => {
        const active = useMatch(() => s.path);
        {/* const { t } = useI18n(); */}
        return (
          <Show when={active()}>
            <SectionHeading label={s.label} />
            <s.View />
          </Show>
        );
      })}
    </>
  );
};

// ── Mobile: back button header ────────────────────────────────────────────────
const MobileHeader: Component = () => {
  const { t } = useI18n();
  // Show the back button when we're on a sub-route
  const onSubRoute = SECTIONS.some((s) => useMatch(() => s.path)());

  return (
    <Show when={onSubRoute}>
      <div class="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
        <A
          href="/settings"
          class="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          ← {t("nav.settings")}
        </A>
      </div>
    </Show>
  );
};

// ── Root ──────────────────────────────────────────────────────────────────────
export default function SettingsView() {
  const { t } = useI18n();
  const isDesktop = createMediaQuery("(min-width: 768px)");

  // Are we on the /settings index (no sub-route)?
  // const onIndex = useMatch(() => "/settings");
  // Are we on any sub-route?
  const onSubRoute = () => SECTIONS.some((s) => useMatch(() => s.path)());

  return (
    <Show
      when={isDesktop()}
      fallback={
        // ── Mobile layout ────────────────────────────────────────────────────
        <div class="max-w-2xl mx-auto">
          {/* On /settings: show list. On /settings/:section: show section + back. */}
          <Show
            when={onSubRoute()}
            fallback={
              <>
                <div class="px-4 pt-6 pb-3">
                  <h1 class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {t("nav.settings")}
                  </h1>
                </div>
                <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mx-4">
                  {SECTIONS.map((s) => (
                    <MobileListItem section={s} />
                  ))}
                </div>
              </>
            }
          >
            {/* Mobile section page */}
            <MobileHeader />
            <div class="px-4 py-6">
              <SectionOutlet sections={SECTIONS} />
            </div>
          </Show>
        </div>
      }
    >
      {/* ── Desktop layout ──────────────────────────────────────────────────── */}
      <div class="max-w-3xl mx-auto p-6">
        <h1 class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          {t("nav.settings")}
        </h1>
        <div class="flex gap-8">
          {/* Sidebar */}
          <nav
            class="w-44 shrink-0 flex flex-col gap-1"
            aria-label="Settings sections"
          >
            {SECTIONS.map((s) => (
              <NavItem section={s} />
            ))}
          </nav>

          {/* Content */}
          <div class="flex-1 min-w-0">
            <Show
              when={onSubRoute()}
              fallback={
                // Default: redirect feel — show Display section on desktop index
                <>
                  <SectionHeading label={"settings.display"} />
                  <DisplaySection />
                </>
              }
            >
              <SectionOutlet sections={SECTIONS} />
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
