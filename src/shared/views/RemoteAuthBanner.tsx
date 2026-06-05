// src/shared/views/RemoteAuthBanner.tsx
import { type Component, Show } from "solid-js";
import type { ViewerRole } from "../store/site-config.ts";
import { useI18n } from "@/i18n";

interface Props {
  role: ViewerRole;
  subjectNick: string;
  homeUrl?: string;
}

const RemoteAuthBanner: Component<Props> = (props) => {
  const { t } = useI18n();

  // OWA zot-redirect URL — Hubzilla's standard remote login handshake
  const owaUrl = () =>
    `/magic?f=&dest=${encodeURIComponent(window.location.href)}`;

  return (
    <Show
      when={
        props.role !== "owner" &&
        props.role !== "local" &&
        props.role !== "admin"
      }
    >
      <div
        class="flex items-center gap-3 px-4 py-2 text-sm
                  bg-amber-50 dark:bg-amber-900/30
                  border-b border-amber-200 dark:border-amber-700
                  text-amber-900 dark:text-amber-200"
      >
        {/* Remote authenticated */}
        <Show when={props.role === "remote"}>
          <span class="opacity-70">🌐</span>
          <span class="flex-1">
            <Show
              when={props.subjectNick}
              fallback={<>{t("ui.remote_visitor")}</>}
            >
              {t("ui.remote_visitor_channel", { nick: props.subjectNick })}
            </Show>
          </span>
          <Show when={props.homeUrl}>
            <a
              href={props.homeUrl}
              class="shrink-0 px-3 py-1 rounded-full text-xs font-medium
                     bg-amber-200 dark:bg-amber-700 hover:bg-amber-300
                     dark:hover:bg-amber-600 transition-colors"
            >
              {t("ui.go_home_link")}
            </a>
          </Show>
        </Show>

        {/* Anonymous */}
        <Show when={props.role === "anonymous"}>
          <span class="opacity-70">👁</span>
          <span class="flex-1">
            <Show
              when={props.subjectNick}
              fallback={<>{t("ui.remote_visitor")}</>}
            >
              {t("ui.remote_guest", { nick: props.subjectNick })}
            </Show>
          </span>
          <a
            href={owaUrl()}
            class="shrink-0 px-3 py-1 rounded-full text-xs font-medium
                   bg-amber-200 dark:bg-amber-700 hover:bg-amber-300
                   dark:hover:bg-amber-600 transition-colors"
          >
            {t("ui.sign_in_remote")}
          </a>
        </Show>
      </div>
    </Show>
  );
};

export default RemoteAuthBanner;
