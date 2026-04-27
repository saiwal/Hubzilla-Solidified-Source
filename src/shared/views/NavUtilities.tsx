import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import HelpTrigger from "./HelpTrigger";
import { A } from "@solidjs/router";
import { BiRegularGlobe, BiRegularInfoCircle } from "solid-icons/bi";

export default function NavUtilities() {
  return (
    <div class="mt-3 pt-2 border-t border-[var(--nav-border)] flex flex-col gap-1">
      <LanguageSwitcher />
      <ThemeToggle />
      <div class="flex gap-1 px-1">
        <HelpTrigger />
        <A
          href="/siteinfo"
          title="Site info"
          class="px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:opacity-80 transition-colors"
          activeClass="bg-[var(--nav-active)]"
        >
          <BiRegularInfoCircle class="w-5 h-5" />
        </A>
        <A
          href="/pubsites"
          title="Public Hubs"
          class="px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:opacity-80 transition-colors"
          activeClass="bg-[var(--nav-active)]"
        >
          <BiRegularGlobe class="w-5 h-5" />
        </A>
      </div>
    </div>
  );
}
