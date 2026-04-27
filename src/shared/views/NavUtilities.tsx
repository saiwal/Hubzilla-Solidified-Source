import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import HelpTrigger from "./HelpTrigger";
import { A } from "@solidjs/router";
import { BiRegularGlobe, BiRegularInfoCircle } from "solid-icons/bi";

export default function NavUtilities() {
  return (
    <div class="mt-3 pt-2 border-t border-rim flex items-center gap-0.5 px-1">
      <LanguageSwitcher />
      <ThemeToggle />
      <HelpTrigger />
      <A
        href="/siteinfo"
        title="Site info"
        class="p-2 rounded-lg text-muted hover:bg-elevated hover:text-txt transition-colors"
      >
        <BiRegularInfoCircle size={18} />
      </A>
      <A
        href="/pubsites"
        title="Public Hubs"
        class="p-2 rounded-lg text-muted hover:bg-elevated hover:text-txt transition-colors"
      >
        <BiRegularGlobe size={18} />
      </A>
    </div>
  );
}
