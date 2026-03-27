import { type ParentComponent, createSignal, Show } from "solid-js";
import { For } from "solid-js";
import NavItem from "./shared/ui/NavItem";
import { useNav } from "./shared/hooks/useNav";
import ThemeToggle from "./shared/ui/ThemeToggle";
import LanguageSwitcher from "./shared/ui/LanguageSwitcher";
import Slot from "./shared/ui/Slot";

const Layout: ParentComponent = (props) => {
  const [rightOpen, setRightOpen] = createSignal(false);
  const [navOpen, setNavOpen] = createSignal(false);
  const navItems = useNav();
  const closeAll = () => {
    setRightOpen(false);
    setNavOpen(false);
  };

  return (
    <div class="fixed inset-0 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div class="flex h-full">
        {/* Left Sidebar */}
        <aside class="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
          <h2 class="text-xl font-bold mb-6">Hubzilla</h2>
          <nav class="space-y-2 flex-1 overflow-y-auto">
            <For each={navItems()}>{(item) => <NavItem {...item} />}</For>
          </nav>
          {/* optional module-injected widget below nav */}
          <Slot name="leftBottom" />
          <LanguageSwitcher />
          <ThemeToggle />
        </aside>

        {/* Main Content */}
        <main class="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {props.children}
        </main>

        {/* Right Sidebar */}
        <aside
          class={`
          fixed inset-y-0 right-0 z-40 w-64 shrink-0
          bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          xl:relative xl:translate-x-0 xl:block
          ${rightOpen() ? "translate-x-0" : "translate-x-full"}
        `}
        >
          <Slot name="right" />
        </aside>

        {/* Backdrop */}
        <Show when={rightOpen() || navOpen()}>
          <div
            class="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={closeAll}
          />
        </Show>

        {/* Mobile Nav Drawer */}
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

        {/* Mobile Bottom Nav */}
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
  );
};

export default Layout;
