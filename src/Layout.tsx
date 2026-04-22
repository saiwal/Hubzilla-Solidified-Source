import { type ParentComponent, createSignal, Show, createMemo } from "solid-js";
import { For } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import NavItem, { getNavIcon } from "./shared/views/NavItem";
import { useNav, useNavActionItems } from "./shared/lib/useNav";
import ThemeToggle from "./shared/views/ThemeToggle";
import LanguageSwitcher from "./shared/views/LanguageSwitcher";
import Slot from "./shared/views/Slot";
import RemoteAuthBanner from "./shared/views/RemoteAuthBanner";
import { useViewerRole, useSubjectNick } from "./shared/store/site-config";
import HelpOverlay from "./shared/views/HelpOverlay";
import HelpTrigger from "./shared/views/HelpTrigger";
import {
  MdFillClose,
  MdFillChevron_right,
  MdFillMore_horiz,
  MdFillApps,
} from "solid-icons/md";
import { useOnlineStatus } from "./shared/lib/useOnlineStatus";

const NAV_VARS = `
  :root {
    --nav-text:        #6b7280;
    --nav-text-active: #111827;
    --nav-hover:       rgba(0,0,0,0.05);
    --nav-active:      #e5e7eb;
    --nav-bg:          #ffffff;
    --nav-border:      #e5e7eb;
  }
  .dark {
    --nav-text:        #9ca3af;
    --nav-text-active: #f9fafb;
    --nav-hover:       rgba(255,255,255,0.07);
    --nav-active:      #1e293b;
    --nav-bg:          #0f172a;
    --nav-border:      #1e293b;
  }
`;

// ── Mobile bottom tab ─────────────────────────────────────────────────────────
function MobileTab(props: {
  href: string | (() => string);
  label: string | (() => string);
  icon?: string;
}) {
  const href = () =>
    typeof props.href === "function" ? props.href() : props.href;
  const label = () =>
    typeof props.label === "function" ? props.label() : props.label;

  return (
    <A
      href={href()}
      end={href() === "/"}
      class="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl
             text-[var(--nav-text)] hover:text-[var(--nav-text-active)]
             hover:bg-[var(--nav-hover)] transition-colors min-w-0"
      activeClass="!text-[var(--nav-text-active)]"
    >
      <span class="flex items-center">{getNavIcon(props.icon, 22)}</span>
      <span class="text-[10px] font-medium leading-none truncate max-w-[52px]">
        {label()}
      </span>
    </A>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
const Layout: ParentComponent = (props) => {
  const [rightOpen, setRightOpen] = createSignal(false);
  const [moreOpen, setMoreOpen] = createSignal(false);

  const subjectNick = useSubjectNick();
  const actionItems = useNavActionItems();
  const location = useLocation();
  const navItems = useNav(subjectNick);
  const viewerRole = useViewerRole();
  const online = useOnlineStatus();

  let mainRef!: HTMLElement;
  const [showScrollTop, setShowScrollTop] = createSignal(false);
  const onMainScroll = () => setShowScrollTop(mainRef.scrollTop > 300);

  const activeModuleId = createMemo(() => {
    const segment = location.pathname.split("/").filter(Boolean)[0];
    return segment ?? "";
  });

  const closeAll = () => {
    setRightOpen(false);
    setMoreOpen(false);
  };
  const isOwner = () => viewerRole() === "owner";
  const isLocalUser = () =>
    viewerRole() === "owner" || viewerRole() === "local";

  const BOTTOM_LIMIT = 4;
  const bottomItems = () => navItems().slice(0, BOTTOM_LIMIT);
  const moreItems = () => [...navItems().slice(BOTTOM_LIMIT), ...actionItems()];

  return (
    <div class="fixed inset-0 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <style>{NAV_VARS}</style>
      <HelpOverlay />

      <div class="flex h-full flex-col">
        <Show when={!online()}>
          <div
            class="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2
              bg-amber-500 text-amber-950 text-sm font-medium py-1.5 select-none"
          >
            <svg
              class="w-4 h-4 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58
        9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z
        M11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            Offline — showing cached content
          </div>
        </Show>
        <RemoteAuthBanner role={viewerRole()} subjectNick={subjectNick()} />

        <div class="flex flex-1 min-h-0">
          {/* ═══════════════════════════════════════════════════════
              DESKTOP LEFT SIDEBAR — fixed width, always visible
          ═══════════════════════════════════════════════════════ */}
          <aside
            class="hidden lg:flex flex-col w-56 shrink-0 relative z-20
                        bg-[var(--nav-bg)] border-r border-[var(--nav-border)] py-3 px-2"
          >
            {/* Brand */}
            <div class="flex items-center gap-3 px-1 mb-5 h-9">
              <span
                class="shrink-0 w-8 h-8 rounded-xl bg-gray-900 dark:bg-white
                           flex items-center justify-center
                           text-white dark:text-gray-900 text-[11px] font-bold select-none"
              >
                Hz
              </span>
              <span class="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
                Hubzilla
              </span>
            </div>

            {/* Primary nav */}
            <nav class="flex-1 flex flex-col gap-0.5 overflow-y-auto">
              <For each={navItems()}>
                {(item) => (
                  <NavItem
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                  />
                )}
              </For>
            </nav>

            <div class="my-2 h-px bg-[var(--nav-border)]" />

            {/* Action items */}
            <div class="flex flex-col gap-0.5">
              <For each={actionItems()}>
                {(item) => (
                  <NavItem
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                  />
                )}
              </For>
            </div>

            <Show when={isLocalUser()}>
              <div class="mt-1">
                <Slot name="leftBottom" moduleId={activeModuleId()} />
              </div>
            </Show>

            {/* Utilities */}
            <div class="mt-3 pt-2 border-t border-[var(--nav-border)] flex flex-col gap-1">
              <LanguageSwitcher />
              <div class="flex gap-1 px-1">
                <ThemeToggle />
                <HelpTrigger />
              </div>
            </div>
          </aside>

          {/* ═══════════════════════════════════════════════════════
              MAIN CONTENT
          ═══════════════════════════════════════════════════════ */}
          <main
            ref={mainRef}
            onScroll={onMainScroll}
            class="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6 relative"
          >
            <Show when={isOwner()}>
              <Slot name="mainTop" moduleId={activeModuleId()} />
            </Show>

            {props.children}

            <Show when={showScrollTop()}>
              <button
                onClick={() => mainRef.scrollTo({ top: 0, behavior: "smooth" })}
                class="sticky bottom-6 float-right mr-2 z-10
                       w-9 h-9 rounded-full flex items-center justify-center
                       bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                       shadow hover:shadow-md transition-all"
                title="Scroll to top"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>
            </Show>
          </main>

          {/* ═══════════════════════════════════════════════════════
              RIGHT SIDEBAR
          ═══════════════════════════════════════════════════════ */}
          <aside
            class={`
            fixed inset-y-0 right-0 z-40 w-72 shrink-0 p-4 overflow-y-auto space-y-4
            bg-[var(--nav-bg)] border-l border-[var(--nav-border)]
            transform transition-transform duration-300 ease-in-out
            xl:relative xl:translate-x-0 xl:block
            ${rightOpen() ? "translate-x-0" : "translate-x-full"}
          `}
          >
            <div class="flex items-center justify-between xl:hidden mb-2">
              <span class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Panel
              </span>
              <button
                onClick={() => setRightOpen(false)}
                class="p-1 rounded-lg hover:bg-[var(--nav-hover)] transition"
              >
                <MdFillClose size={18} />
              </button>
            </div>
            <Slot name="right" moduleId={activeModuleId()} />
            <Show when={!isLocalUser()}>
              <Slot name="rightVisitor" moduleId={activeModuleId()} />
            </Show>
          </aside>

          {/* Backdrop */}
          <Show when={rightOpen() || moreOpen()}>
            <div
              class="fixed inset-0 z-30 bg-black/25 backdrop-blur-[1px] lg:hidden"
              onClick={closeAll}
            />
          </Show>

          {/* ═══════════════════════════════════════════════════════
              MOBILE — "More" bottom sheet drawer
          ═══════════════════════════════════════════════════════ */}
          <div
            class={`
            fixed left-0 right-0 z-40 lg:hidden
            bg-[var(--nav-bg)] border-t border-[var(--nav-border)]
            rounded-t-2xl shadow-2xl px-4 pt-3 pb-6
            transform transition-transform duration-300 ease-in-out
            max-h-[72vh] overflow-y-auto
            ${moreOpen() ? "translate-y-0 bottom-16" : "translate-y-full bottom-16"}
          `}
          >
            <div class="mx-auto mb-4 w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />

            <div class="flex items-center justify-between mb-3">
              <span class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                More
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                class="p-1.5 rounded-lg hover:bg-[var(--nav-hover)] transition"
              >
                <MdFillClose size={16} />
              </button>
            </div>

            <nav class="flex flex-col gap-0.5">
              <For each={moreItems()}>
                {(item) => (
                  <span onClick={closeAll}>
                    <NavItem
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                    />
                  </span>
                )}
              </For>
            </nav>

            <div class="mt-4 pt-3 border-t border-[var(--nav-border)] flex items-center gap-2 flex-wrap">
              <LanguageSwitcher />
              <ThemeToggle />
              <HelpTrigger />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              MOBILE — Bottom Tab Bar
          ═══════════════════════════════════════════════════════ */}
          <nav
            class="
            fixed bottom-0 left-0 right-0 z-50 h-16 lg:hidden
            bg-[var(--nav-bg)] border-t border-[var(--nav-border)]
            flex items-center px-2 gap-1
          "
          >
            <For each={bottomItems()}>
              {(item) => (
                <MobileTab
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                />
              )}
            </For>

            <Show when={moreItems().length > 0}>
              <button
                onClick={() => {
                  setMoreOpen((o) => !o);
                  setRightOpen(false);
                }}
                class={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl
                        text-[10px] font-medium transition-colors min-w-0
                        ${
                          moreOpen()
                            ? "text-[var(--nav-text-active)] bg-[var(--nav-active)]"
                            : "text-[var(--nav-text)] hover:bg-[var(--nav-hover)]"
                        }`}
              >
                <MdFillMore_horiz size={22} />
                <span>More</span>
              </button>
            </Show>

            <button
              onClick={() => {
                setRightOpen((o) => !o);
                setMoreOpen(false);
              }}
              class={`flex-none px-2 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl
                      text-[10px] font-medium transition-colors
                      ${
                        rightOpen()
                          ? "text-[var(--nav-text-active)] bg-[var(--nav-active)]"
                          : "text-[var(--nav-text)] hover:bg-[var(--nav-hover)]"
                      }`}
            >
              <span
                style={`display:flex; transform: rotate(${rightOpen() ? "180deg" : "0deg"}); transition: transform 200ms`}
              >
                <MdFillChevron_right size={22} />
              </span>
              <span>Panel</span>
            </button>
          </nav>

          {/* Right sidebar FAB (lg only — not xl) */}
          <button
            onClick={() => setRightOpen((o) => !o)}
            class="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full shadow-lg
                   bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                   hidden lg:flex xl:hidden items-center justify-center
                   hover:shadow-xl transition-all"
          >
            <MdFillApps size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Layout;
