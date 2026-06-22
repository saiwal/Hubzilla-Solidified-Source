import { createSignal } from "solid-js";
import { useI18n } from "@/i18n";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import type { MimeType, EditorTab } from "../types/editor.types";

interface Props {
  initialBody: string;
  mimeType: string;
  saving: boolean;
  onSave: (body: string, commitMsg: string) => void;
  onCancel: () => void;
}

export default function WikiComposer(props: Props) {
  const { t } = useI18n();
  const caps = CAPABILITIES.wiki;

  const [body, setBody] = createSignal(props.initialBody);
  const [tab, setTab] = createSignal<EditorTab>("source");
  const [commitMsg, setCommitMsg] = createSignal("");

  const mime = () => (props.mimeType as MimeType) ?? "text/markdown";

  return (
    <div class="space-y-3">
      <RichEditor
        body={body()}
        onInput={setBody}
        capabilities={caps}
        tab={tab()}
        onTabChange={setTab}
        mimetype={mime()}
        placeholder={t("editor.start_writing")}
        minHeight="320px"
      />

      <input
        type="text"
        class="w-full bg-surface border border-rim text-txt rounded-lg px-3 py-2 text-sm
               hover:border-rim-strong focus:outline-none focus:border-accent transition-colors"
        placeholder={t("wiki.changes_placeholder")}
        value={commitMsg()}
        onInput={(e) => setCommitMsg(e.currentTarget.value)}
      />

      <div class="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={props.onCancel}
          class="text-sm border border-rim text-muted hover:bg-elevated px-3 py-1.5 rounded-lg transition-colors"
        >
          {t("wiki.cancel_edit")}
        </button>
        <button
          type="button"
          onClick={() => props.onSave(body(), commitMsg())}
          disabled={props.saving || !body().trim()}
          class="text-sm bg-accent text-accent-fg px-4 py-1.5 rounded-lg transition-opacity
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {props.saving ? t("wiki.saving") : t("wiki.save")}
        </button>
      </div>
    </div>
  );
}
