import { createSignal, createMemo, For, Show, type Component } from "solid-js";
import { Portal } from "solid-js/web";
import { MdFillFolder } from "solid-icons/md";
import { useI18n } from "@/i18n";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { listFolder, moveItem, copyItem } from "../api";
import type { FileMeta } from "../api";

type Mode = "move" | "copy";
interface BreadcrumbEntry { name: string; hash: string; }

interface Props {
  item: FileMeta;
  nick: string;
  onDone: (updated: FileMeta) => void;
  onClose: () => void;
}

const MoveCopyModal: Component<Props> = (props) => {
  const { t } = useI18n();
  const [mode, setMode] = createSignal<Mode>("move");
  const [crumbs, setCrumbs] = createSignal<BreadcrumbEntry[]>([]);
  const currentHash = () => crumbs()[crumbs().length - 1]?.hash ?? "";
  const [busy, setBusy] = createSignal(false);
  const [err, setErr] = createSignal("");

  const [items] = createQueryResource(
    "files-folder",
    () => ({ nick: props.nick, hash: currentHash() }),
    ({ nick, hash }) => listFolder(nick, hash),
  );

  // Folders only — can't navigate into or target the very item being moved/copied.
  const folders = createMemo(() =>
    (items() ?? []).filter((f) => f.is_dir && f.hash !== props.item.hash)
  );

  function enterFolder(folder: FileMeta) {
    setCrumbs((prev) => [...prev, { name: folder.filename, hash: folder.hash }]);
  }

  function navToCrumb(idx: number) {
    setCrumbs((prev) => (idx < 0 ? [] : prev.slice(0, idx + 1)));
  }

  const destinationIsSameFolder = () => currentHash() === props.item.folder;
  // Moving into the folder the item already lives in is a no-op classic core's UI never allows either.
  const disableSubmit = createMemo(() => busy() || (mode() === "move" && destinationIsSameFolder()));

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const updated = mode() === "move"
        ? await moveItem(props.nick, props.item.hash, currentHash())
        : await copyItem(props.nick, props.item.hash, currentHash());
      props.onDone(updated);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Portal>
      <div
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
      >
        <div class="flex flex-col w-full max-w-md h-[70vh] rounded-xl border border-rim bg-surface shadow-2xl overflow-hidden">
          <header class="flex items-center justify-between px-4 py-3 border-b border-rim shrink-0">
            <span class="text-sm font-semibold text-txt truncate">
              {t("files_mod.move_or_copy")} — <span class="font-normal text-muted">{props.item.filename}</span>
            </span>
            <button onClick={props.onClose} class="text-muted hover:text-txt text-lg leading-none shrink-0 ml-2">
              ×
            </button>
          </header>

          {/* Move / Copy toggle */}
          <div class="flex border-b border-rim shrink-0 px-4 pt-2 gap-2">
            <ToggleButton active={mode() === "move"} label={t("files_mod.move_action") as string} onClick={() => setMode("move")} />
            <ToggleButton active={mode() === "copy"} label={t("files_mod.copy_action") as string} onClick={() => setMode("copy")} />
          </div>

          {/* Breadcrumb */}
          <div class="flex items-center gap-1 px-4 py-2 text-sm flex-wrap border-b border-rim shrink-0">
            <button
              onClick={() => navToCrumb(-1)}
              class={`hover:text-txt transition-colors ${crumbs().length === 0 ? "text-txt font-medium" : "text-accent"}`}
            >
              {t("files_mod.root_folder")}
            </button>
            <For each={crumbs()}>
              {(crumb, i) => (
                <>
                  <span class="text-muted">/</span>
                  <button
                    onClick={() => navToCrumb(i())}
                    class={`hover:text-txt transition-colors truncate max-w-[120px] ${
                      i() === crumbs().length - 1 ? "text-txt font-medium" : "text-accent"
                    }`}
                  >
                    {crumb.name}
                  </button>
                </>
              )}
            </For>
          </div>

          {/* Folder listing */}
          <div class="flex-1 overflow-y-auto min-h-0 p-2 space-y-0.5">
            <Show when={!items.loading} fallback={<p class="text-center text-sm text-muted py-8">…</p>}>
              <Show
                when={folders().length > 0}
                fallback={<p class="text-center text-sm text-muted py-8">{t("files_mod.folder_empty")}</p>}
              >
                <For each={folders()}>
                  {(folder) => (
                    <button
                      onClick={() => enterFolder(folder)}
                      class="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-elevated transition-colors text-left"
                    >
                      <MdFillFolder class="w-5 h-5 text-accent shrink-0" />
                      <span class="text-sm text-txt truncate">{folder.filename}</span>
                    </button>
                  )}
                </For>
              </Show>
            </Show>
          </div>

          <Show when={err()}>
            <p class="px-4 pb-2 text-sm text-red-500">{err()}</p>
          </Show>

          <footer class="flex items-center justify-between px-4 py-3 border-t border-rim bg-elevated shrink-0">
            <span class="text-xs text-muted truncate">{t("files_mod.choose_destination")}</span>
            <div class="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={props.onClose}
                class="px-3 py-1.5 text-sm rounded-lg border border-rim text-muted hover:bg-surface transition-colors"
              >
                {t("files_mod.cancel")}
              </button>
              <button
                type="button"
                disabled={disableSubmit()}
                onClick={submit}
                class="px-4 py-1.5 text-sm font-medium rounded-lg bg-accent text-accent-fg
                       hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {busy() ? t("files_mod.saving") : (mode() === "move" ? t("files_mod.move_here") : t("files_mod.copy_here"))}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Portal>
  );
};

export default MoveCopyModal;

function ToggleButton(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
        props.active ? "border-accent text-txt" : "border-transparent text-muted hover:text-txt hover:border-rim"
      }`}
    >
      {props.label}
    </button>
  );
}
