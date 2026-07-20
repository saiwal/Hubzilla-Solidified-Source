import { Show, type Component } from "solid-js";
import { Portal } from "solid-js/web";
import { useI18n } from "@/i18n";
import { toast } from "@/shared/store/toast";
import { davPath } from "../api";
import type { FileMeta } from "../api";

interface Props {
  item: FileMeta;
  nick: string;
  onClose: () => void;
}

/**
 * Mirrors classic core's Info panel (Zotlabs/Storage/Browser.php): a set of
 * ready-to-paste BBCode snippets rather than a size/date/mimetype detail view
 * (those already appear as columns in the row itself).
 */
const FileInfoModal: Component<Props> = (props) => {
  const { t } = useI18n();

  const fullPath = () => `${window.location.origin}${davPath(props.nick, props.item.display_path)}`;

  const attachBBCode = () =>
    props.item.is_dir ? "" : `[attachment]${props.item.hash},${props.item.revision}[/attachment]`;

  const embedBBCode = () => {
    const ft = props.item.filetype;
    if (props.item.is_photo) return `[zmg]${fullPath()}[/zmg]`;
    if (ft.startsWith("video/")) return `[zvideo]${fullPath()}[/zvideo]`;
    if (ft.startsWith("audio/")) return `[zaudio]${fullPath()}[/zaudio]`;
    return "";
  };

  const linkBBCode = () => `[zrl=${fullPath()}]${props.item.filename}[/zrl]`;

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("files_mod.copied") as string);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <Portal>
      <div
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
      >
        <div class="w-full max-w-md rounded-xl border border-rim bg-surface shadow-2xl overflow-hidden">
          <header class="flex items-center justify-between px-4 py-3 border-b border-rim">
            <span class="text-sm font-semibold text-txt truncate">
              {t("files_mod.info")} — <span class="font-normal text-muted">{props.item.filename}</span>
            </span>
            <button onClick={props.onClose} class="text-muted hover:text-txt text-lg leading-none shrink-0 ml-2">
              ×
            </button>
          </header>
          <div class="p-4 space-y-3">
            <Show when={attachBBCode()}>
              <BBCodeField
                label={t("files_mod.attachment_bbcode") as string}
                value={attachBBCode()}
                onCopy={copy}
                copyLabel={t("files_mod.copy_btn") as string}
              />
            </Show>
            <Show when={embedBBCode()}>
              <BBCodeField
                label={t("files_mod.embed_bbcode") as string}
                value={embedBBCode()}
                onCopy={copy}
                copyLabel={t("files_mod.copy_btn") as string}
              />
            </Show>
            <BBCodeField
              label={t("files_mod.link_bbcode") as string}
              value={linkBBCode()}
              onCopy={copy}
              copyLabel={t("files_mod.copy_btn") as string}
            />
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default FileInfoModal;

function BBCodeField(props: { label: string; value: string; onCopy: (v: string) => void; copyLabel: string }) {
  return (
    <div class="space-y-1">
      <label class="block text-xs text-muted">{props.label}</label>
      <div class="flex gap-2">
        <input
          type="text"
          readonly
          value={props.value}
          onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
          class="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-rim bg-elevated text-xs text-txt font-mono"
        />
        <button
          type="button"
          onClick={() => props.onCopy(props.value)}
          class="px-3 py-1.5 rounded-lg border border-rim text-xs text-muted hover:bg-elevated transition-colors shrink-0"
        >
          {props.copyLabel}
        </button>
      </div>
    </div>
  );
}
