// src/shared/views/RemoteAuthBanner.tsx
import { type Component, Show } from "solid-js";
import type { ViewerRole } from "../store/site-config.ts";

interface Props {
  role: ViewerRole;
  subjectNick: string;
}

const RemoteAuthBanner: Component<Props> = (props) => {
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
          <span class="i-bi-person-check-fill opacity-70" />
          <span>
            You're viewing <strong>{props.subjectNick}</strong>'s channel as a
            remote identity.
          </span>
          {/* No login link needed — they're already authed via OWA */}
        </Show>

        {/* Anonymous */}
        <Show when={props.role === "anonymous"}>
          <span class="opacity-70">👁</span>
          <span class="flex-1">
            You're browsing{" "}
            <Show when={props.subjectNick} fallback={<>this channel</>}>
              <strong>{props.subjectNick}</strong>'s channel{" "}
            </Show>
            as a guest.
          </span>
          <a
            href={owaUrl()}
            class="shrink-0 px-3 py-1 rounded-full text-xs font-medium
                   bg-amber-200 dark:bg-amber-700 hover:bg-amber-300
                   dark:hover:bg-amber-600 transition-colors"
          >
            Sign in / Remote auth
          </a>
        </Show>
      </div>
    </Show>
  );
};

export default RemoteAuthBanner;
