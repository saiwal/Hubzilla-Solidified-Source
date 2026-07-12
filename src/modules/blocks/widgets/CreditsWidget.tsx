// Site credits strip — copyright + "Powered by Hubzilla" + active theme name.
// Global, footer-only: always on, on every page, not user-removable (same
// convention as the always-mounted shared.notifications / chat.pinnedRooms
// widgets, just in a different slot).

import { Show } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { fetchSiteInfo } from "@/modules/siteinfo/api";
import { THEMES } from "@/shared/types/theme.types";
import { useTheme } from "@/shared/lib/useTheme";
import { useI18n } from "@/i18n";

export default function CreditsWidget() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [info] = createQueryResource("siteinfo", fetchSiteInfo);

  const themeLabel = () => THEMES.find((th) => th.id === theme())?.label ?? theme();
  const year = new Date().getFullYear();

  return (
    <footer class="border-t border-rim px-4 pt-2 pb-3 text-center text-xs text-muted">
      <p>
        &copy; {year}{" "}
        <Show when={info()} fallback="…">
          {(d) => d().site_name}
        </Show>
        {" · "}
        {t("ui.siteinfo_powered_by")}{" "}
        <Show when={info()} fallback="Hubzilla">
          {(d) => (
            <a
              href={d().project_link}
              target="_blank"
              rel="noopener noreferrer"
              class="text-accent hover:underline"
            >
              Hubzilla{d().version ? ` v${d().version}` : ""}
            </a>
          )}
        </Show>
        {" · "}
        {t("widgets.credits_theme")}: Solidified - {themeLabel()}
      </p>
    </footer>
  );
}
