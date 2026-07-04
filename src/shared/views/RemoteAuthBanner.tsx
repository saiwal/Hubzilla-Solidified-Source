// src/shared/views/RemoteAuthBanner.tsx
import { type Component, Show, createSignal, lazy, Suspense } from "solid-js";
import { Portal } from "solid-js/web";
import type { ViewerRole } from "../store/site-config.ts";
import { useI18n } from "@/i18n";
import { MdOutlinePublic, MdOutlineVisibility } from "solid-icons/md";
import { BiRegularX } from "solid-icons/bi";

const LoginForm = lazy(() => import("@/modules/login/views/LoginForm"));

interface Props {
  role: ViewerRole;
  subjectNick: string;
  homeUrl?: string;
}

const RemoteAuthBanner: Component<Props> = (props) => {
  const { t } = useI18n();
  const [showLogin, setShowLogin] = createSignal(false);

  // After login the page fully reloads, so capture the URL at click time
  const dest = () => window.location.pathname + window.location.search;

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
          <MdOutlinePublic class="w-4 h-4 opacity-70 shrink-0" />
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
          <MdOutlineVisibility class="w-4 h-4 opacity-70 shrink-0" />
          <span class="flex-1">
            <Show
              when={props.subjectNick}
              fallback={<>{t("ui.remote_visitor")}</>}
            >
              {t("ui.remote_guest", { nick: props.subjectNick })}
            </Show>
          </span>
          <button
            onClick={() => setShowLogin(true)}
            class="shrink-0 px-3 py-1 rounded-full text-xs font-medium
                   bg-amber-200 dark:bg-amber-700 hover:bg-amber-300
                   dark:hover:bg-amber-600 transition-colors"
          >
            {t("ui.sign_in_remote")}
          </button>
        </Show>
      </div>

      {/* Login modal — keeps the visitor on the current page */}
      <Show when={showLogin()}>
        <Portal>
          <div
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/80"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowLogin(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowLogin(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              class="relative w-full max-w-md max-h-[90svh] overflow-y-auto"
            >
              <button
                onClick={() => setShowLogin(false)}
                class="absolute top-3 right-3 z-10 p-1.5 rounded-lg hover:bg-elevated
                       text-subtle hover:text-txt transition-colors"
                aria-label={t("post.modal_close")}
              >
                <BiRegularX />
              </button>
              <Suspense>
                <LoginForm dest={dest()} />
              </Suspense>
            </div>
          </div>
        </Portal>
      </Show>
    </Show>
  );
};

export default RemoteAuthBanner;
