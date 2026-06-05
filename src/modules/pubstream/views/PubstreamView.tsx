// src/modules/pubstream/views/PubstreamView.tsx
import { Show, createEffect, onMount, createSignal } from "solid-js";
import { useI18n } from "@/i18n";
import {
  threads,
  posts,
  loading,
  hasMore,
  disabled,
  meta,
  loadPubstream,
  loadMore,
  optimisticLike,
  optimisticRepeat,
} from "../store";
import MasonryView, {
  MasonryPlaceholder,
} from "@/shared/stream/feedviews/MasonryView";
import type { StreamHandlers } from "@/shared/stream/types";
import { toggleVerb, repeatItem } from "@/shared/stream/store/actions-store";
import { MdFillPublic, MdFillWhatshot } from "solid-icons/md";

// ── iid lookup from the pubstream flat posts signal ────────────────────────
function iidForMid(mid: string): number {
  const found = posts().find((p) => p.mid === mid || p.uuid === mid);
  return found?.iid ?? 0;
}

// ── Handlers ───────────────────────────────────────────────────────────────
function usePubstreamHandlers(tag: () => string): StreamHandlers {
  return {
    onLike(mid: string) {
      const iid = iidForMid(mid);
      optimisticLike(mid);
      toggleVerb(iid, "like").catch(() => optimisticLike(mid));
    },
    onDislike(_mid: string) {
      // not surfaced in pubstream masonry cards
    },
    onRepeat(mid: string) {
      const iid = iidForMid(mid);
      const node = posts().find((p) => p.mid === mid || p.uuid === mid);
      if (!node || node.viewerRepeated) return;
      optimisticRepeat(mid);
      repeatItem(iid).catch(() => optimisticRepeat(mid));
    },
    onComment(
      _parentMid: string,
      _body: string,
      _name: string,
      _avatar: string,
    ) {
      loadPubstream(tag() || undefined);
    },
    onLoadComments: (_mid: string, _uuid: string) => Promise.resolve(),
  };
}

// ── Tag filter bar ─────────────────────────────────────────────────────────
function TagBar(props: { tag: string; onTag: (t: string) => void }) {
  const { t: tr } = useI18n();
  const [draft, setDraft] = createSignal(props.tag);
  const submit = () => props.onTag(draft().trim());

  return (
    <div class="flex items-center gap-2 mb-4">
      <span class="text-muted text-sm">#</span>
      <input
        value={draft()}
        onInput={(e) => setDraft(e.currentTarget.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={tr("pubstream.filter_by_tag")}
        class="flex-1 bg-surface border border-rim rounded-lg px-3 py-1.5 text-sm
               text-txt placeholder:text-subtle focus:outline-none
               hover:border-rim-strong focus:border-accent transition-colors"
      />
      <Show when={draft()}>
        <button
          onClick={() => {
            setDraft("");
            props.onTag("");
          }}
          class="text-xs text-muted hover:text-txt px-2 py-1.5 rounded-lg
                 border border-rim hover:bg-elevated transition-colors"
        >
          {tr("pubstream.clear")}
        </button>
      </Show>
      <button
        onClick={submit}
        class="text-xs px-3 py-1.5 rounded-lg bg-accent text-accent-fg font-medium
               hover:opacity-90 transition-opacity"
      >
        {tr("pubstream.filter")}
      </button>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────
export default function PubstreamView() {
  const { t } = useI18n();
  const [tag, setTag] = createSignal("");
  const handlers = usePubstreamHandlers(tag);

  // Load on mount; fast back-nav guard
  onMount(() => {
    if (threads().length === 0) {
      loadPubstream();
    }
  });

  // Reload when tag changes — skip the initial reactive run
  let tagInitialized = false;
  createEffect(() => {
    const currentTag = tag();
    if (!tagInitialized) {
      tagInitialized = true;
      return;
    }
    loadPubstream(currentTag || undefined);
  });

  return (
    <Show
      when={!disabled()}
      fallback={
        <div class="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <MdFillPublic size={40} class="text-muted" />
          <p class="text-txt font-semibold">{t("pubstream.unavailable")}</p>
          <p class="text-sm text-muted max-w-xs">
            {t("pubstream.unavailable_desc")}
          </p>
        </div>
      }
    >
      <div class="">
        {/* Header */}
        <div class="flex items-center gap-2 mb-4">
          <MdFillWhatshot size={18} class="text-accent shrink-0" />
          <h1 class="font-semibold text-txt text-base">{t("pubstream.title")}</h1>
          <Show when={meta()?.firehose}>
            <span class="ml-auto text-xs text-muted border border-rim rounded-full px-2 py-0.5">
              {t("pubstream.firehose")}
            </span>
          </Show>
        </div>

        {/* Tag filter */}
        <TagBar tag={tag()} onTag={setTag} />

        {/* Initial skeleton */}
        <Show
          when={!loading() || threads().length > 0}
          fallback={<MasonryPlaceholder count={12} />}
        >
          <MasonryView posts={threads()} handlers={handlers} />
        </Show>

        {/* Append skeleton while loading more */}
        <Show when={loading() && threads().length > 0}>
          <MasonryPlaceholder count={3} />
        </Show>

        {/* Load more */}
        <Show when={!loading() && hasMore() && threads().length > 0}>
          <div class="flex justify-center mt-6 mb-2">
            <button
              onClick={() => loadMore(tag() || undefined)}
              class="px-6 py-2 rounded-xl border border-rim text-sm text-muted
                     hover:bg-elevated hover:text-txt transition-colors"
            >
              {t("pubstream.load_more")}
            </button>
          </div>
        </Show>

        <Show when={!loading() && !hasMore() && threads().length > 0}>
          <p class="text-center text-xs text-muted mt-6 mb-2">
            {t("pubstream.end_of_stream")}
          </p>
        </Show>
      </div>
    </Show>
  );
}
