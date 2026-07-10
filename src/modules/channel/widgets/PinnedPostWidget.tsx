// Pinned post card (config: { mid }): showcases one wall post in the sidebar.
// multiInstance — pin several posts in any order.

import { Show } from "solid-js";
import DOMPurify from "dompurify";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { A } from "@solidjs/router";
import type { WidgetProps } from "@/shared/types/module.types";
import { usePageNick } from "@/shared/store/site-config";
import { editingWidgets } from "@/shared/store/widget-layout";
import { useI18n } from "@/i18n";
import { bbcode } from "@/shared/lib/bbcode";
import { fetchChannelPosts } from "../api";

function EditHint(props: { text: string }) {
  return (
    <Show when={editingWidgets()}>
      <div class="bg-surface border border-rim rounded-xl px-4 py-3">
        <p class="text-xs text-muted">{props.text}</p>
      </div>
    </Show>
  );
}

export default function PinnedPostWidget(props: WidgetProps) {
  const { t } = useI18n();
  const nick = usePageNick();
  const mid = () => String(props.config?.mid ?? "");

  const [post] = createQueryResource(
    "pinned-post",
    () => (nick() && mid() ? { nick: nick(), mid: mid() } : null),
    async (p) => {
      const res = await fetchChannelPosts(p.nick, { mid: p.mid });
      return res.items[0] ?? null;
    },
  );

  const bodyHtml = () => DOMPurify.sanitize(bbcode(post()?.body ?? ""));

  return (
    <Show when={mid()} fallback={<EditHint text={t("widgets.not_configured")} />}>
      <Show when={post.loading}>
        <div class="bg-surface border border-rim rounded-xl p-4 space-y-2 animate-pulse">
          <div class="h-3 bg-elevated rounded w-1/2" />
          <div class="h-3 bg-elevated rounded w-full" />
          <div class="h-3 bg-elevated rounded w-2/3" />
        </div>
      </Show>

      <Show when={!post.loading}>
        <Show when={post()} fallback={<EditHint text={t("widgets.item_unavailable")} />}>
          {(p) => (
            <div class="bg-surface border border-rim rounded-xl overflow-hidden">
              <div class="px-4 py-3 flex items-center gap-2">
                <img
                  src={p().authorAvatar}
                  alt=""
                  class="w-6 h-6 rounded-full shrink-0"
                  loading="lazy"
                />
                <div class="min-w-0">
                  <p class="text-xs font-medium text-txt truncate">{p().authorName}</p>
                  <p class="text-[10px] text-muted">
                    {new Date(p().created).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div class="px-4 py-3">
                <Show when={p().title}>
                  <h4 class="text-sm font-semibold text-txt mb-1">{p().title}</h4>
                </Show>
                <div
                  class="prose prose-sm dark:prose-invert max-w-none text-txt
                         max-h-40 overflow-hidden text-sm"
                  innerHTML={bodyHtml()}
                />
              </div>

              <A
                href={`/display/${p().uuid}`}
                class="block px-4 py-2 border-t border-rim text-center text-xs font-medium
                       text-accent hover:bg-elevated transition-colors"
              >
                {t("widgets.view_post")}
              </A>
            </div>
          )}
        </Show>
      </Show>
    </Show>
  );
}
