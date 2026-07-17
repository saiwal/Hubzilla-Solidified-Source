import { Show } from "solid-js";
import { useI18n } from "@/i18n";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import { apiFetch } from "@/shared/lib/fetch";

interface Props {
  nick: string;
  /** Pass existing note to edit */
  initial?: {
    mid: string;
    body: string;
    mimetype: string;
  };
  onSaved?: () => void;
  onCancel?: () => void;
}

export default function NoteComposer(props: Props) {
  const { t } = useI18n();
  const caps = CAPABILITIES.note;
  const isEditing = () => !!props.initial?.mid;
  const scope = props.initial?.mid
    ? `note:edit:${props.initial.mid}`
    : "note:new";

  const store = createComposerStore(async (body, meta) => {
    if (isEditing()) {
      // Edit via existing item-edit endpoint
      const res = await apiFetch(`/spa/item/${props.initial!.mid}/edit`, {
        method: "POST",
        body: JSON.stringify({
          body,
          title:    "",
          summary:  "",
          mimetype: meta.mimetype ?? "text/bbcode",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Save failed");
      }
    } else {
      const res = await apiFetch("/spa/notes", {
        method: "POST",
        body: JSON.stringify({
          body,
          mimetype: meta.mimetype ?? "text/bbcode",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
      }
    }

    props.onSaved?.();
  }, scope, { initialBody: props.initial?.body });

  if (props.initial?.mimetype) {
    store.setMimetype(props.initial.mimetype as any);
  }

  return (
    <div class="space-y-3">
      <RichEditor
        body={store.body()}
        onInput={store.setBody}
        capabilities={caps}
        tab={store.tab()}
        onTabChange={store.setTab}
        mimetype={store.mimetype()}
        onCtrlEnter={() => void store.submit()}
        placeholder={t("notepad.placeholder")}
        minHeight="120px"
      />

      <div class="flex items-center gap-2 justify-end">
        <Show when={props.onCancel}>
          <button
            type="button"
            onClick={() => { store.reset(); props.onCancel?.(); }}
            class="px-3 py-1.5 text-sm rounded-lg border border-rim text-muted
                   hover:bg-elevated transition-colors"
          >
            {t("notepad.cancel")}
          </button>
        </Show>

        <button
          type="button"
          onClick={() => void store.submit()}
          disabled={store.submitting() || !store.body().trim()}
          class="px-4 py-1.5 text-sm font-medium rounded-lg bg-accent text-accent-fg
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {store.submitting() ? t("notepad.saving") : t("notepad.save_btn")}
        </button>
      </div>
    </div>
  );
}
