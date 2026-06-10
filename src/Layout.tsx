import { type ParentComponent, createSignal, Show, createMemo, createEffect, on } from "solid-js";
import { For } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import NavItem, { getNavIcon } from "./shared/views/NavItem";
import { useNav, useNavActionItems } from "./shared/lib/useNav";
import { moduleIdForPath } from "./shared/lib/module-registry";
import Slot from "./shared/views/Slot";
import RemoteAuthBanner from "./shared/views/RemoteAuthBanner";
import { useViewerRole, useSubjectNick } from "./shared/store/site-config";
import { useChannelTheme } from "./shared/lib/useChannelTheme";
import HelpOverlay from "./shared/views/HelpOverlay";
import {
  MdFillClose,
  MdFillChevron_right,
  MdFillMore_horiz,
  MdFillApps,
} from "solid-icons/md";
import { useOnlineStatus } from "./shared/lib/useOnlineStatus";
import NavUtilities from "./shared/views/NavUtilities";
import { notifCount } from "@/shared/lib/notificationCount";
import { createMediaQuery } from "@solid-primitives/media";
import { useNavActions, useNavViewer, setNavNick } from "./shared/store/nav-store";
import { motion } from "solid-motionone";
import ToastContainer from "@/shared/views/ToastContainer";
import { useI18n } from "@/i18n";
void motion;

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
             text-muted hover:text-txt hover:bg-elevated
             transition-colors min-w-0"
      activeClass="!text-txt"
    >
      <span aria-hidden="true" class="flex items-center">{getNavIcon(props.icon, 22)}</span>
      <span class="text-[0.625rem] font-medium leading-none truncate max-w-[52px]">
        {label()}
      </span>
    </A>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
const Layout: ParentComponent = (props) => {
  const { t } = useI18n();
  const [rightOpen, setRightOpen] = createSignal(false);
  const [moreOpen, setMoreOpen] = createSignal(false);
  const [actionsOpen, setActionsOpen] = createSignal(false);

  const subjectNick = useSubjectNick();
  createEffect(() => setNavNick(subjectNick()));
  useChannelTheme(subjectNick);
  const actionItems = useNavActionItems();
  const location = useLocation();
  const navItems = useNav(subjectNick);
  const viewerRole = useViewerRole();
  const online = useOnlineStatus();
  const navViewer = useNavViewer();
  const navActions = useNavActions();

  const isXl = createMediaQuery("(min-width: 1280px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let mainRef!: HTMLElement;
  let morePanelRef!: HTMLDivElement;
  let moreButtonRef!: HTMLButtonElement;
  let panelButtonRef!: HTMLButtonElement;
  let rightCloseRef!: HTMLButtonElement;
  const [showScrollTop, setShowScrollTop] = createSignal(false);
  const onMainScroll = () => setShowScrollTop(mainRef.scrollTop > 300);

  createEffect(() => {
    if (moreOpen()) requestAnimationFrame(() => {
      morePanelRef?.querySelector<HTMLElement>("a, button")?.focus();
    });
  });
  createEffect(() => {
    if (rightOpen() && !isXl()) requestAnimationFrame(() => rightCloseRef?.focus());
  });
  createEffect(on(rightOpen, (isOpen, prevOpen) => {
    if (prevOpen && !isOpen) panelButtonRef?.focus();
  }, { defer: true }));
  createEffect(on(moreOpen, (isOpen, prevOpen) => {
    if (prevOpen && !isOpen) moreButtonRef?.focus();
  }, { defer: true }));

  const activeModuleId = createMemo(() => moduleIdForPath(location.pathname));

  const closeAll = () => {
    setRightOpen(false);
    setMoreOpen(false);
    setActionsOpen(false);
  };

  const isOwner = () => viewerRole() === "owner";
  const isLocalUser = () =>
    viewerRole() === "owner" || viewerRole() === "local";

  const isMedium = createMediaQuery("(min-width: 768px)");
  const bottomLimit = () => (isMedium() ? 8 : 4);
  const bottomItems = () => navItems().slice(0, bottomLimit());

  return (
    <div class="fixed inset-0 bg-base text-txt hz-app-root">
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-2 focus:left-2
               focus:px-4 focus:py-2 focus:rounded-lg focus:bg-base focus:text-txt
               focus:border focus:border-rim focus:shadow-lg focus:outline-none"
      >
        {t("layout.skip_to_content")}
      </a>
      <HelpOverlay />
      <ToastContainer />

      <div class="flex h-full flex-col">
        {/* ── Offline banner ── */}
        <Show when={!online()}>
          <div
            class="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2
                   bg-amber-500 text-amber-950 text-sm font-medium py-1.5 select-none"
          >
            <svg
              aria-hidden="true"
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
            {t("layout.offline")}
          </div>
        </Show>

        <RemoteAuthBanner
          role={viewerRole()}
          subjectNick={subjectNick()}
          homeUrl={navActions().navhome}
        />

        <div class="flex flex-1 min-h-0">
          {/* ═══════════════════════════════════════════════════════
              DESKTOP LEFT SIDEBAR
          ═══════════════════════════════════════════════════════ */}
          <aside
            aria-label={t("layout.navigation")}
            class="hidden lg:flex flex-col w-56 shrink-0 relative z-20
                   bg-surface border-r border-rim py-3 px-2"
          >
            {/* Brand */}
            <div class="flex items-center gap-3 px-1 mb-5 h-9">
              <span
                class="shrink-0 w-8 h-8 rounded-xl bg-txt
                       flex items-center justify-center
                       text-base text-[11px] font-bold select-none"
              >
                Hz
              </span>
              <span class="text-sm font-semibold tracking-tight text-txt">
                Hubzilla
              </span>
            </div>

            {/* Primary nav */}
            <nav aria-label="Primary" class="flex-1 flex flex-col gap-0.5 overflow-y-auto">
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

            {/* Action items — toggled by avatar click */}
            <Show when={actionsOpen() && actionItems().length > 0}>
              <div class="my-2 h-px bg-rim" />
              <div
                use:motion={{
                  initial: { opacity: 0, y: 8 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: reducedMotion ? 0 : 0.18, easing: "ease-out" },
                }}
                class="flex flex-col gap-0.5"
              >
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
            </Show>

            <Show when={isLocalUser()}>
              <div class="mt-1">
                <Slot name="leftBottom" moduleId={activeModuleId()} />
              </div>
            </Show>

            <NavUtilities
              viewer={navViewer()}
              actions={navActions()}
              actionsOpen={actionsOpen()}
              onUserMenuToggle={() => setActionsOpen((o) => !o)}
            />
          </aside>

          {/* ═══════════════════════════════════════════════════════
              MAIN CONTENT
          ═══════════════════════════════════════════════════════ */}
          <main
            id="main-content"
            ref={mainRef}
            onScroll={onMainScroll}
            class="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6 relative"
          >
            <span
              class="sr-only"
              aria-live="polite"
              aria-atomic="true"
            >
              {notifCount() > 0 ? `${notifCount()} notification${notifCount() === 1 ? "" : "s"}` : ""}
            </span>
            <Show when={isOwner()}>
              <Slot name="mainTop" moduleId={activeModuleId()} />
            </Show>

            {props.children}

            <Show when={showScrollTop()}>
              <button
                onClick={() => mainRef.scrollTo({ top: 0, behavior: "smooth" })}
                class="sticky bottom-2 lg:bottom-14 xl:bottom-2 float-right z-10
                       w-10 h-10 rounded-full flex items-center justify-center
                       bg-elevated border border-rim
                       shadow hover:shadow-md transition-all"
                aria-label="Scroll to top"
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
            id="right-sidebar"
            aria-label="Sidebar panel"
            aria-hidden={!isXl() && !rightOpen()}
            class={`
              fixed inset-y-0 right-0 z-40 w-72 shrink-0 p-4 overflow-y-auto space-y-4
              bg-surface border-l border-rim
              transform transition-transform duration-300 ease-in-out
              xl:relative xl:translate-x-0 xl:block
              ${rightOpen() ? "translate-x-0" : "translate-x-full"}
            `}
          >
            <div class="flex items-center justify-between xl:hidden mb-2">
              <span class="text-[10px] font-semibold uppercase tracking-widest text-muted">
                {t("layout.panel")}
              </span>
              <button
                ref={rightCloseRef}
                onClick={() => setRightOpen(false)}
                aria-label="Close sidebar"
                class="p-1 rounded-lg hover:bg-elevated transition"
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
              aria-hidden="true"
              class="fixed inset-0 z-30 bg-black/25 lg:hidden"
              onClick={closeAll}
            />
          </Show>

          {/* ═══════════════════════════════════════════════════════
              MOBILE — "More" bottom sheet drawer
          ═══════════════════════════════════════════════════════ */}
          <div
            id="more-drawer"
            ref={morePanelRef}
            role="navigation"
            aria-label={t("layout.more")}
            aria-hidden={!moreOpen()}
            class={`
              fixed left-0 right-0 z-40 lg:hidden
              bg-surface border-t border-rim
              rounded-t-2xl shadow-2xl px-0 pt-0 pb-3
              transform transition-transform duration-300 ease-in-out
              max-h-[72vh] overflow-visible
              ${moreOpen() ? "translate-y-0 bottom-16" : "translate-y-full bottom-16"}
            `}
          >
            <div class="mx-auto mt-3 mb-4 w-9 h-1 rounded-full bg-rim" />

            {/* ── Nav tiles ── */}
            <Show when={navItems().slice(bottomLimit()).length > 0}>
              <p class="px-4 pb-2 text-[0.625rem] font-semibold uppercase tracking-widest text-muted">
                {t("layout.navigation")}
              </p>
              <div class="grid grid-cols-4 gap-1.5 px-2.5 pb-4">
                <For each={navItems().slice(bottomLimit())}>
                  {(item) => (
                    <A
                      href={
                        typeof item.href === "function"
                          ? item.href()
                          : item.href
                      }
                      onClick={closeAll}
                      class="flex flex-col items-center gap-1.5 py-2.5 px-1
                             rounded-xl bg-elevated border border-rim
                             text-txt text-xs font-medium leading-tight text-center
                             hover:brightness-95 transition-all"
                    >
                      <span aria-hidden="true" class="text-muted">
                        {getNavIcon(item.icon, 20)}
                      </span>
                      <span class="truncate w-full text-center">
                        {typeof item.label === "function"
                          ? item.label()
                          : item.label}
                      </span>
                    </A>
                  )}
                </For>
              </div>
            </Show>

            {/* Action items — toggled by avatar click */}
            <Show when={actionsOpen() && actionItems().length > 0}>
              <div
                use:motion={{
                  initial: { opacity: 0, y: 14 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: reducedMotion ? 0 : 0.2, easing: [0.25, 0.46, 0.45, 0.94] },
                }}
                class="grid grid-cols-4 gap-1.5 px-2.5 pb-4"
              >
                <For each={actionItems()}>
                  {(item) => (
                    <A
                      href={
                        typeof item.href === "function"
                          ? item.href()
                          : item.href
                      }
                      onClick={closeAll}
                      class="flex flex-col items-center gap-1.5 py-2.5 px-1
                             rounded-xl bg-elevated border border-rim
                             text-txt text-xs font-medium leading-tight text-center
                             hover:brightness-95 transition-all"
                    >
                      <span aria-hidden="true" class="text-muted">
                        {getNavIcon(item.icon, 20)}
                      </span>
                      <span class="truncate w-full text-center">
                        {typeof item.label === "function"
                          ? item.label()
                          : item.label}
                      </span>
                    </A>
                  )}
                </For>
              </div>
            </Show>

            <NavUtilities
              viewer={navViewer()}
              actions={navActions()}
              actionsOpen={actionsOpen()}
              onUserMenuToggle={() => setActionsOpen((o) => !o)}
            />
          </div>

          {/* ═══════════════════════════════════════════════════════
              MOBILE — Bottom Tab Bar
          ═══════════════════════════════════════════════════════ */}
          <nav
            aria-label={t("layout.navigation")}
            class="fixed bottom-0 left-0 right-0 z-50 h-16 lg:hidden
                   bg-surface border-t border-rim
                   flex items-center px-2 gap-1"
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

            {/* <Show when={moreItems().length > 0}> */}
              <button
                ref={moreButtonRef}
                onClick={() => {
                  setMoreOpen((o) => !o);
                  setRightOpen(false);
                }}
                aria-expanded={moreOpen()}
                aria-controls="more-drawer"
                class={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl
                        text-[0.625rem] font-medium transition-colors min-w-0
                        ${
                          moreOpen()
                            ? "text-txt bg-elevated"
                            : "text-muted hover:bg-elevated"
                        }`}
              >
                <MdFillMore_horiz size={22} />
                <span>{t("layout.more")}</span>
              </button>
            {/* </Show> */}

            <button
              ref={panelButtonRef}
              onClick={() => {
                setRightOpen((o) => !o);
                setMoreOpen(false);
              }}
              aria-expanded={rightOpen()}
              aria-controls="right-sidebar"
              aria-label={rightOpen() ? "Close panel" : "Open panel"}
              class={`flex-none px-2 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl
                      text-[0.625rem] font-medium transition-colors
                      ${
                        rightOpen()
                          ? "text-txt bg-elevated"
                          : "text-muted hover:bg-elevated"
                      }`}
            >
              <span class="relative flex items-center justify-center">
                <span
                  style={`display:flex; transform: rotate(${rightOpen() ? "180deg" : "0deg"}); transition: transform 200ms`}
                >
                  <MdFillChevron_right size={22} />
                </span>
                <Show when={!rightOpen() && notifCount() > 0}>
                  <span
                    class="absolute -top-2 -right-1.5 min-w-[14px] h-[14px] px-[3px]
                           rounded-full bg-accent text-accent-fg
                           text-[9px] font-bold leading-[14px] text-center
                           pointer-events-none select-none"
                  >
                    {notifCount() > 99 ? "99+" : notifCount()}
                  </span>
                </Show>
              </span>
              <span>{t("layout.panel")}</span>
            </button>
          </nav>

          {/* Right sidebar FAB (lg only — not xl) */}
          <button
            onClick={() => setRightOpen((o) => !o)}
            aria-expanded={rightOpen()}
            aria-controls="right-sidebar"
            aria-label={rightOpen() ? "Close panel" : "Open panel"}
            class="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full shadow-lg
                   bg-elevated border border-rim
                   hidden lg:flex xl:hidden items-center justify-center
                   hover:shadow-xl transition-all"
          >
            <span class="relative inline-flex">
              <Show when={!rightOpen() && notifCount() > 0}>
                <span
                  class="absolute top-0 right-0 translate-x-3/2 -translate-y-3/2 min-w-[14px] h-[14px] px-[3px]
                         rounded-full bg-accent text-accent-fg
                         text-[9px] font-bold leading-[14px] text-center
                         pointer-events-none select-none"
                >
                  {notifCount() > 99 ? "99+" : notifCount()}
                </span>
              </Show>
            </span>
            <MdFillApps size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Layout;
