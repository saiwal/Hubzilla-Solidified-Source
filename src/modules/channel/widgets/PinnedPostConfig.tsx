// Settings form for PinnedPostWidget instances: pick one of the channel's
// recent wall posts.

import { createSignal, For } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { usePageNick } from "@/shared/store/site-config";
import { useI18n } from "@/i18n";
import { fetchChannelPosts } from "../api";
import type { Post } from "@/shared/types/post.types";

function postLabel(p: Post): string {
  if (p.title) return p.title.slice(0, 60);
  const text = p.body.replace(/\[[^\]]{0,60}\]/g, "").replace(/\s+/g, " ").trim();
  return text.slice(0, 60) || p.created.slice(0, 10);
}

export default function PinnedPostConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const nick = usePageNick();
  const [mid, setMid] = createSignal(String(props.config.mid ?? ""));

  const [posts] = createQueryResource(
    "channel-posts",
    () => nick() || null,
    async (n) => (await fetchChannelPosts(n, { order: "created" })).items,
  );

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_post")}
        <select
          value={mid()}
          onChange={(e) => setMid(e.currentTarget.value)}
          class="mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt"
        >
          <option value="">—</option>
          <For each={posts() ?? []}>
            {(p) => <option value={p.mid}>{postLabel(p)}</option>}
          </For>
        </select>
      </label>
      <button
        onClick={() => props.onSave({ mid: mid() })}
        disabled={!mid()}
        class="self-end px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
               hover:brightness-110 transition-all disabled:opacity-40"
      >
        {t("widgets.cfg_save")}
      </button>
    </div>
  );
}
