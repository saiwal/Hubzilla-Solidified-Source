// src/modules/notify/views/NotifyRedirectView.tsx
import { createEffect, createSignal, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { useI18n } from "@/i18n";
import { resolveNotify } from "../api";

function toRelativePath(href: string): string {
  try {
    if (!href.startsWith("http")) return href;
    const u = new URL(href);
    return u.pathname + u.search + u.hash;
  } catch {
    return href;
  }
}

export default function NotifyRedirectView() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [notFound, setNotFound] = createSignal(false);

  let started = false;
  createEffect(() => {
    const id = params.id;
    if (!id || started) return;
    started = true;
    resolveNotify(id)
      .then(({ link }) => {
        const path = toRelativePath(link);
        if (path.startsWith("/")) {
          navigate(path, { replace: true });
        } else {
          window.location.assign(link);
        }
      })
      .catch(() => setNotFound(true));
  });

  return (
    <div class="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center gap-3 text-muted">
      <Show
        when={!notFound()}
        fallback={
          <>
            <p class="text-sm font-medium">{t("notify.not_found")}</p>
            <a href="/notify" class="text-xs text-accent hover:underline">
              {t("notify.back")}
            </a>
          </>
        }
      >
        <svg
          class="w-5 h-5 animate-spin text-accent"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
        <p class="text-sm">{t("notify.resolving")}</p>
      </Show>
    </div>
  );
}
