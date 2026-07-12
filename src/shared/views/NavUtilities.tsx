import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import HelpTrigger from "./HelpTrigger";
import { A } from "@solidjs/router";
import { BiRegularInfoCircle } from "solid-icons/bi";
import type { NavViewer, NavActions } from "@/shared/lib/nav-api";
import Usermenu from "./UserMenu";
import { useI18n } from "@/i18n";
import { helpable } from "@/shared/lib/helpable";
void helpable;

interface NavUtilitiesProps {
  viewer?: NavViewer;
  actions?: NavActions;
  actionsOpen?: boolean;
  onUserMenuToggle?: () => void;
}

export default function NavUtilities(props: NavUtilitiesProps) {
  const { t } = useI18n();
  return (
    <>
      <Usermenu
        viewer={props.viewer}
        actions={props.actions}
        actionsOpen={props.actionsOpen}
        onUserMenuToggle={props.onUserMenuToggle}
      />

      <div class="mt-3 pt-2 border-t border-rim flex items-center gap-0.5 px-1 justify-evenly">
        <div use:helpable="nav.language">
          <LanguageSwitcher />
        </div>
        <div use:helpable="nav.theme">
          <ThemeToggle />
        </div>
        <div use:helpable="nav.help_mode">
          <HelpTrigger />
        </div>
        <div use:helpable="nav.siteinfo">
          <A
            href="/siteinfo"
            title={t("ui.site_info")}
            class="inline-flex items-center justify-center p-2 rounded-lg text-muted hover:bg-elevated hover:text-txt transition-colors"
          >
            <BiRegularInfoCircle size={18} />
          </A>
        </div>
      </div>
    </>
  );
}
