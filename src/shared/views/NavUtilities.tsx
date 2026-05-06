import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import HelpTrigger from "./HelpTrigger";
import { A } from "@solidjs/router";
import { BiRegularInfoCircle } from "solid-icons/bi";
import type { NavViewer, NavActions } from "@/shared/lib/nav-api";
import Usermenu from "./UserMenu";

interface NavUtilitiesProps {
  viewer?: NavViewer;
  actions?: NavActions;
  actionsOpen?: boolean;
  onUserMenuToggle?: () => void;
}

export default function NavUtilities(props: NavUtilitiesProps) {
  return (
    <>
      <Usermenu
        viewer={props.viewer}
        actions={props.actions}
        actionsOpen={props.actionsOpen}
        onUserMenuToggle={props.onUserMenuToggle}
      />

      <div class="mt-3 pt-2 border-t border-rim flex items-center gap-0.5 px-1 justify-evenly">
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
      </div>
    </>
  );
}
