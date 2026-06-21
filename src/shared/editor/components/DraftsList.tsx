import { For, Show } from "solid-js";
import type { SavedDraft } from "../store/createComposerStore";
import { useI18n } from "@/i18n";

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface DraftsListProps {
  drafts: SavedDraft[];
  onLoad: (draft: SavedDraft) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function DraftsList(props: DraftsListProps) {
  const { t } = useI18n();
  return (
    <div class="border-t border-rim bg-surface shrink-0">
      <div class="flex items-center justify-between px-4 py-2 border-b border-rim bg-elevated">
        <span class="text-xs font-semibold tracking-widest uppercase text-muted select-none">
          {t("editor.drafts_header")}
        </span>
        <button
          type="button"
          title={t("editor.close_drafts")}
          onClick={props.onClose}
          class="p-1 rounded text-muted hover:text-txt transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="max-h-44 overflow-y-auto divide-y divide-rim">
        <Show
          when={props.drafts.length > 0}
          fallback={
            <p class="px-4 py-5 text-center text-xs text-muted">{t("editor.no_drafts")}</p>
          }
        >
          <For each={props.drafts}>
            {(draft) => (
              <div class="flex items-start gap-2 px-4 py-2.5 hover:bg-elevated group">
                <div
                  class="flex-1 min-w-0 cursor-pointer"
                  onClick={() => props.onLoad(draft)}
                >
                  <Show when={draft.title}>
                    <p class="text-xs font-medium text-txt truncate">{draft.title}</p>
                  </Show>
                  <p class="text-xs text-muted truncate">
                    <Show when={draft.preview} fallback={<em>{t("editor.empty_draft")}</em>}>
                      {draft.preview}
                    </Show>
                  </p>
                  <p class="text-[10px] text-muted/60 mt-0.5">{timeAgo(draft.updated)}</p>
                </div>

                <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    title={t("editor.load_draft")}
                    onClick={() => props.onLoad(draft)}
                    class="px-2 py-0.5 text-[10px] rounded border border-rim text-muted
                           hover:text-txt hover:border-rim-strong transition-colors"
                  >
                    {t("editor.load_btn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onDelete(draft.id)}
                    class="px-2 py-0.5 text-[10px] rounded border border-rim text-muted
                           hover:text-red-500 hover:border-red-400/50 transition-colors"
                  >
                    {t("editor.delete_draft")}
                  </button>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}
