import { type Component, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import { BiRegularX } from "solid-icons/bi";
import { useI18n } from "@/i18n";
import { FOLDER_ICON_PATH, MessageList } from "./MessageList";

interface FolderMessagesModalProps {
  folder: string;
  onClose: () => void;
}

const FolderMessagesModal: Component<FolderMessagesModalProps> = (props) => {
  const { t } = useI18n();
  let dialogRef!: HTMLDivElement;
  onMount(() => dialogRef?.focus());

  return (
    <Portal>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/80"
        onClick={(e) => {
          if (e.target === e.currentTarget) props.onClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="folder-modal-title"
          tabindex="-1"
          class="relative w-full max-w-full lg:max-w-[50%] max-h-[90svh] flex flex-col
                 bg-base rounded-2xl shadow-2xl overflow-hidden focus:outline-none"
        >
          {/* Header */}
          <div class="flex items-center justify-between px-5 py-3 shrink-0 border-b border-rim bg-surface">
            <h2 id="folder-modal-title" class="text-sm font-semibold text-txt flex items-center gap-2 min-w-0">
              <svg class="w-4 h-4 shrink-0 text-muted" fill="currentColor" viewBox="0 0 24 24">
                <path d={FOLDER_ICON_PATH} />
              </svg>
              <span class="truncate">{props.folder}</span>
            </h2>
            <button
              onClick={props.onClose}
              class="p-1.5 rounded-lg hover:bg-elevated
                     text-subtle hover:text-txt transition-colors shrink-0"
              aria-label={t("post.modal_close")}
            >
              <BiRegularX />
            </button>
          </div>

          <div class="min-h-[280px] max-h-[65vh] flex flex-col">
            <MessageList type="folder" file={props.folder} />
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default FolderMessagesModal;
