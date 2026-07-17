// Site-wide announcements list, backed by GET/POST /spa/announcements
// (Handlers/Announcements.php). Public read; admins get an inline add/delete
// form right in the widget instead of a separate admin page.

import { createSignal, For, Show } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { apiFetch } from "@/shared/lib/fetch";
import { useIsAdmin } from "@/shared/store/site-config";
import { useI18n } from "@/i18n";

interface Announcement {
  id: string;
  title: string;
  body: string;
  created: string;
}

async function fetchAnnouncements(): Promise<Announcement[]> {
  const res = await apiFetch("/spa/announcements");
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []) as Announcement[];
}

export default function SiteAnnouncementsWidget() {
  const { t, locale } = useI18n();
  const isAdmin = useIsAdmin();

  const [list, { refetch, mutate }] = createQueryResource("site-announcements", fetchAnnouncements);
  const [title, setTitle] = createSignal("");
  const [body, setBody] = createSignal("");
  const [posting, setPosting] = createSignal(false);

  const post = async () => {
    if (!title().trim() && !body().trim()) return;
    setPosting(true);
    try {
      const res = await apiFetch("/spa/announcements", {
        method: "POST",
        body: JSON.stringify({ action: "create", title: title().trim(), body: body().trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        mutate(json.data as Announcement[]);
        setTitle("");
        setBody("");
      }
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    const res = await apiFetch("/spa/announcements", {
      method: "POST",
      body: JSON.stringify({ action: "delete", id }),
    });
    if (res.ok) refetch();
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString(locale());
  };

  return (
    <div class="bg-surface border border-rim rounded-xl p-4">
      <h3 class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
        {t("widgets.site_announcements")}
      </h3>

      <Show
        when={(list()?.length ?? 0) > 0}
        fallback={<p class="text-xs text-muted">{t("widgets.no_announcements")}</p>}
      >
        <ul class="flex flex-col gap-3">
          <For each={list()}>
            {(a) => (
              <li class="border-b border-rim last:border-0 pb-3 last:pb-0">
                <div class="flex items-start justify-between gap-2">
                  <Show when={a.title}>
                    <p class="text-sm font-medium text-txt">{a.title}</p>
                  </Show>
                  <Show when={isAdmin()}>
                    <button
                      onClick={() => remove(a.id)}
                      class="shrink-0 text-[11px] text-muted hover:text-txt"
                    >
                      {t("widgets.delete_announcement")}
                    </button>
                  </Show>
                </div>
                <Show when={a.body}>
                  <p class="text-xs text-muted mt-0.5 whitespace-pre-wrap">{a.body}</p>
                </Show>
                <p class="text-[10px] text-muted mt-1">{fmtDate(a.created)}</p>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <Show when={isAdmin()}>
        <div class="mt-3 pt-3 border-t border-rim flex flex-col gap-1.5">
          <input
            type="text"
            value={title()}
            maxLength={120}
            placeholder={t("widgets.cfg_announcement_title")}
            onInput={(e) => setTitle(e.currentTarget.value)}
            class="w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt"
          />
          <textarea
            value={body()}
            maxLength={1000}
            rows={2}
            placeholder={t("widgets.cfg_announcement_body")}
            onInput={(e) => setBody(e.currentTarget.value)}
            class="w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt resize-y"
          />
          <button
            onClick={post}
            disabled={posting() || (!title().trim() && !body().trim())}
            class="self-end px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
                   hover:brightness-110 transition-all disabled:opacity-40"
          >
            {t("widgets.post_announcement")}
          </button>
        </div>
      </Show>
    </div>
  );
}
