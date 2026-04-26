import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import HelpTrigger from "./HelpTrigger";
import { A } from "@solidjs/router";
import { BiRegularGlobe, BiRegularInfoCircle } from "solid-icons/bi";

export default function NavUtilities() {
  return (
    <div class="mt-3 pt-2 border-t border-[var(--nav-border)] flex flex-col gap-1">
      <LanguageSwitcher />
      <div class="flex gap-1 px-1">
        <ThemeToggle />
        <HelpTrigger />
        <A
          href="/siteinfo"
          title="Site info"
          class="p-2 rounded-lg hover:bg-[var(--nav-hover)] transition-colors"
          activeClass="bg-[var(--nav-active)]"
        >
          <BiRegularInfoCircle class="w-5 h-5" />
        </A>
        <A
          href="/pubsites"
          title="Public Hubs"
          class="p-2 rounded-lg hover:bg-[var(--nav-hover)] transition-colors"
          activeClass="bg-[var(--nav-active)]"
        >
          <BiRegularGlobe class="w-5 h-5" />
        </A>
      </div>
    </div>
  );
}
