import {
  type ParentComponent,
  createSignal,
  Show,
  createMemo,
} from "solid-js";
import { For } from "solid-js";
import { useLocation } from "@solidjs/router";
import NavItem from "./shared/views/NavItem";
import { useNav } from "./shared/lib/useNav";
import ThemeToggle from "./shared/views/ThemeToggle";
import LanguageSwitcher from "./shared/views/LanguageSwitcher";
import Slot from "./shared/views/Slot";
import RemoteAuthBanner from "./shared/views/RemoteAuthBanner";
import { useViewerRole, useSubjectNick } from "./shared/store/site-config";

const Layout: ParentComponent = (props) => {
  const [rightOpen, setRightOpen] = createSignal(false);
  const [navOpen, setNavOpen] = createSignal(false);
  const navItems = useNav();
  const location = useLocation();

  const viewerRole = useViewerRole();
  const subjectNick = useSubjectNick();
  let mainRef!: HTMLElement;
  const [showScrollTop, setShowScrollTop] = createSignal(false);
  const onMainScroll = () => setShowScrollTop(mainRef.scrollTop > 300);
  // Derive active module id from first path segment: "/channel/nick" → "channel"
  const activeModuleId = createMemo(() => {
    const segment = location.pathname.split("/").filter(Boolean)[0];
    return segment ?? "";
  });

  const closeAll = () => {
    setRightOpen(false);
    setNavOpen(false);
  };

  // Whether to show the composer/write slot (owner only)
  const isOwner = () => viewerRole() === "owner";
  // Whether to show owner-only sidebar chrome
  const isLocalUser = () =>
    viewerRole() === "owner" || viewerRole() === "local";
  return (
    <div class="fixed inset-0 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div class="flex h-full flex-col">
        {/* ── Remote / anonymous banner ── */}
        <RemoteAuthBanner role={viewerRole()} subjectNick={subjectNick()} />

        <div class="flex flex-1 min-h-0">
          {/* ── Left Sidebar ── */}
          <aside class="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
            <h2 class="text-xl font-bold mb-6">Hubzilla</h2>
            <nav class="space-y-2 flex-1 overflow-y-auto">
              <For each={navItems()}>{(item) => <NavItem {...item} />}</For>
            </nav>

            {/* Only render owner-specific bottom slot for local users */}
            <Show when={isLocalUser()}>
              <Slot name="leftBottom" moduleId={activeModuleId()} />
            </Show>

            <LanguageSwitcher />
            <ThemeToggle />
          </aside>

          {/* ── Main Content ── */}
          <main
            ref={mainRef}
            onScroll={onMainScroll}
            class="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6 relative"
          >
            {/* Owner-only: composer or other write-action slots */}
            <Show when={isOwner()}>
              <Slot name="mainTop" moduleId={activeModuleId()} />
            </Show>

            {props.children}
            <Show when={showScrollTop()}>
              <button
                onClick={() => mainRef.scrollTo({ top: 0, behavior: "smooth" })}
                class="sticky bottom-6 float-right mr-2 z-10
             w-10 h-10 rounded-full flex items-center justify-center
             bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
             shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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

          {/* ── Right Sidebar ── */}
          <aside
            class={`
              fixed inset-y-0 right-0 z-40 w-64 shrink-0
              bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto
              transform transition-transform duration-300 ease-in-out
              xl:relative xl:translate-x-0 xl:block space-y-4
              ${rightOpen() ? "translate-x-0" : "translate-x-full"}
            `}
          >
            <Slot name="right" moduleId={activeModuleId()} />

            {/* Visitor: show a "who owns this channel" info card */}
            <Show when={!isLocalUser()}>
              <Slot name="rightVisitor" moduleId={activeModuleId()} />
            </Show>
          </aside>

          {/* Backdrop */}
          <Show when={rightOpen() || navOpen()}>
            <div
              class="fixed inset-0 z-30 bg-black/40 lg:hidden"
              onClick={closeAll}
            />
          </Show>

          {/* ── Mobile Nav Drawer ── */}
          <div
            class={`
              fixed left-0 right-0 z-40
              bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4
              transform transition-transform duration-300 ease-in-out lg:hidden
              ${navOpen() ? "translate-y-0 bottom-16" : "translate-y-full bottom-16"}
            `}
          >
            <nav class="space-y-2">
              <For each={navItems()}>
                {(item) => (
                  <span onClick={closeAll}>
                    <NavItem {...item} />
                  </span>
                )}
              </For>
            </nav>
          </div>

          {/* ── Mobile Bottom Nav ── */}
          <nav
            class="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-6
                      bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 lg:hidden"
          >
            <button
              onClick={() => {
                setNavOpen((o) => !o);
                setRightOpen(false);
              }}
              class={`p-2 rounded-lg transition-colors ${navOpen() ? "bg-gray-200 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 12h18M3 6h18M3 18h18"
                />
              </svg>
            </button>
            <button
              onClick={() => {
                setRightOpen((o) => !o);
                setNavOpen(false);
              }}
              class={`p-2 rounded-lg transition-colors ${rightOpen() ? "bg-gray-200 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 6h7M13 12h7M13 18h7M4 6h1M4 12h1M4 18h1"
                />
              </svg>
            </button>
          </nav>

          {/* Right sidebar FAB */}
          <button
            onClick={() => setRightOpen((o) => !o)}
            class="fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg bg-white dark:bg-gray-800
                   border border-gray-200 dark:border-gray-700 hidden lg:flex xl:hidden
                   items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 6h7M13 12h7M13 18h7M4 6h1M4 12h1M4 18h1"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Layout;
