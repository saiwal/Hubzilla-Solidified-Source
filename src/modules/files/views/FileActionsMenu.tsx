import { createSignal, createEffect, onCleanup, Show, type Component, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import {
  MdFillMore_vert,
  MdFillLock,
  MdOutlineInfo,
  MdOutlineDrive_file_rename_outline,
  MdOutlineDrive_file_move,
  MdOutlineLabel,
  MdOutlineDownload,
  MdOutlineDelete,
} from "solid-icons/md";
import { useI18n } from "@/i18n";
import { downloadUrl } from "../api";
import type { FileMeta } from "../api";

export type FileAction = "permissions" | "info" | "rename" | "moveCopy" | "categories" | "delete";

interface Props {
  item: FileMeta;
  nick: string;
  onAction: (action: FileAction, item: FileMeta) => void;
  /** Owner-only actions (Permissions, Rename, Move/Copy, Categories, Delete) hide for anyone browsing someone else's cloud. */
  isOwner: boolean;
  deleting?: boolean;
  triggerClass?: string;
}

const FileActionsMenu: Component<Props> = (props) => {
  const { t } = useI18n();
  const [open, setOpen] = createSignal(false);
  const [anchor, setAnchor] = createSignal<{ top: number; right: number } | null>(null);
  let triggerRef!: HTMLButtonElement;
  let portalRef!: HTMLDivElement;

  function toggle(e: MouseEvent) {
    e.stopPropagation();
    if (!open()) {
      const rect = triggerRef.getBoundingClientRect();
      setAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  }

  createEffect(() => {
    if (!open()) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef?.contains(target) && !portalRef?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    onCleanup(() => document.removeEventListener("mousedown", handler));
  });

  function act(action: FileAction) {
    setOpen(false);
    props.onAction(action, props.item);
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={toggle}
        title={t("files_mod.more_actions") as string}
        class={props.triggerClass ?? "p-1.5 rounded text-muted hover:text-txt hover:bg-overlay transition-colors"}
      >
        <MdFillMore_vert size={14} />
      </button>
      <Portal>
        <Show when={open() && anchor()}>
          <div
            ref={portalRef}
            class="fixed z-[9999] min-w-[11rem] bg-surface border border-rim rounded-lg shadow-lg py-1"
            style={{ top: `${anchor()!.top}px`, right: `${anchor()!.right}px` }}
          >
            <MenuItem icon={<MdOutlineInfo size={14} />} label={t("files_mod.info") as string} onClick={() => act("info")} />
            <Show when={props.isOwner}>
              <MenuItem icon={<MdFillLock size={14} />} label={t("files_mod.menu_permissions") as string} onClick={() => act("permissions")} />
              <MenuItem icon={<MdOutlineDrive_file_rename_outline size={14} />} label={t("files_mod.rename") as string} onClick={() => act("rename")} />
              <MenuItem icon={<MdOutlineDrive_file_move size={14} />} label={t("files_mod.move_or_copy") as string} onClick={() => act("moveCopy")} />
              <MenuItem icon={<MdOutlineLabel size={14} />} label={t("files_mod.categories") as string} onClick={() => act("categories")} />
            </Show>
            <a
              href={downloadUrl(props.nick, props.item.hash)}
              download={props.item.is_dir ? `${props.item.filename}.zip` : props.item.filename}
              class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-overlay transition-colors text-left text-txt"
              onClick={() => setOpen(false)}
            >
              <MdOutlineDownload size={14} />
              <span>{t("files_mod.download")}</span>
            </a>
            <Show when={props.isOwner}>
              <MenuItem
                icon={<MdOutlineDelete size={14} />}
                label={t("files_mod.delete") as string}
                onClick={() => act("delete")}
                disabled={props.deleting}
                danger
              />
            </Show>
          </div>
        </Show>
      </Portal>
    </>
  );
};

export default FileActionsMenu;

function MenuItem(props: { icon: JSX.Element; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      class={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-overlay transition-colors text-left disabled:opacity-40 ${
        props.danger ? "text-red-500" : "text-txt"
      }`}
    >
      {props.icon}
      <span>{props.label}</span>
    </button>
  );
}
