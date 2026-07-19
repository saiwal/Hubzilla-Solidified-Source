import { useI18n } from "@/i18n";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { createMemo, createSignal, For, Show, lazy, type Component } from "solid-js";
import { FOLDER_ICON_PATH, TYPE_ICON_PATH } from "./MessageList";

const FolderMessagesModal = lazy(() => import("./FolderMessagesModal"));

interface FolderEntry {
  name: string;
  count: number;
  special?: "starred";
}

interface FoldersData {
  folders: FolderEntry[];
  starredCount: number;
}

async function fetchFoldersData(): Promise<FoldersData> {
  const res = await fetch("/spa/folders?counts=1");
  if (!res.ok) return { folders: [], starredCount: 0 };
  const { data, meta } = await res.json();
  return {
    folders: Array.isArray(data) ? data : [],
    starredCount: Number(meta?.starred_count) || 0,
  };
}

type ViewMode = "list" | "grid";
const VIEW_MODE_KEY = "hz-hq-folder-view";

function loadViewMode(): ViewMode {
  return localStorage.getItem(VIEW_MODE_KEY) === "grid" ? "grid" : "list";
}

const ListIcon: Component<{ class?: string }> = (props) => (
  <svg class={props.class} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

const GridIcon: Component<{ class?: string }> = (props) => (
  <svg class={props.class} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
    />
  </svg>
);

const SkeletonListRow: Component = () => (
  <div class="px-3.5 py-2 flex items-center gap-2 animate-pulse">
    <div class="w-7 h-7 rounded-lg bg-overlay shrink-0" />
    <div class="h-2.5 bg-overlay rounded w-2/5" />
  </div>
);

const SkeletonTile: Component = () => (
  <div class="flex flex-col items-center gap-1.5 p-2 animate-pulse">
    <div class="w-10 h-10 rounded-lg bg-overlay" />
    <div class="h-2 bg-overlay rounded w-4/5" />
  </div>
);

// Embeddable folder-list panel — file-tag folders plus a pinned "Starred"
// entry backed by the item_starred flag (a separate feed from term-based
// folders, see Folders.php). No outer card chrome: the parent (the
// "Folders" tab in HqMessagesWidget) owns that.
export default function HqFoldersWidget() {
  const { t } = useI18n();
  const [viewMode, setViewMode] = createSignal<ViewMode>(loadViewMode());
  const [selectedFolder, setSelectedFolder] = createSignal<FolderEntry | null>(null);
  const [foldersData] = createQueryResource("hq-folder-counts", () => true, fetchFoldersData);

  const entries = createMemo<FolderEntry[]>(() => {
    const d = foldersData();
    const starred: FolderEntry = {
      name: t("hq.msg_tab_starred"),
      count: d?.starredCount ?? 0,
      special: "starred",
    };
    return [starred, ...(d?.folders ?? [])];
  });

  function selectViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  function openFolder(folder: FolderEntry) {
    setSelectedFolder(folder);
  }

  const iconPath = (folder: FolderEntry) =>
    folder.special === "starred" ? TYPE_ICON_PATH.starred : FOLDER_ICON_PATH;
  const iconColor = (folder: FolderEntry) =>
    folder.special === "starred" ? "text-amber-500" : "text-accent/70";

  return (
    <div class="flex-1 flex flex-col overflow-hidden">
      {/* ── View toggle ── */}
      <div class="px-3.5 pt-3 pb-2 shrink-0 flex items-center justify-end">
        <div class="flex items-center gap-0.5 bg-overlay rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => selectViewMode("list")}
            aria-label={t("hq.folder_view_list")}
            aria-pressed={viewMode() === "list"}
            class="p-1 rounded-md transition-colors"
            classList={{
              "bg-surface text-txt shadow-sm": viewMode() === "list",
              "text-muted hover:text-txt": viewMode() !== "list",
            }}
          >
            <ListIcon class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => selectViewMode("grid")}
            aria-label={t("hq.folder_view_grid")}
            aria-pressed={viewMode() === "grid"}
            class="p-1 rounded-md transition-colors"
            classList={{
              "bg-surface text-txt shadow-sm": viewMode() === "grid",
              "text-muted hover:text-txt": viewMode() !== "grid",
            }}
          >
            <GridIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div class="flex-1 overflow-y-auto">
        <Show
          when={!foldersData.loading}
          fallback={
            <Show
              when={viewMode() === "list"}
              fallback={
                <div class="grid grid-cols-3 sm:grid-cols-4 gap-1 p-2">
                  <For each={Array(8)}>{() => <SkeletonTile />}</For>
                </div>
              }
            >
              <For each={Array(5)}>{() => <SkeletonListRow />}</For>
            </Show>
          }
        >
          <Show
            when={viewMode() === "list"}
            fallback={
              <div class="grid grid-cols-3 sm:grid-cols-4 gap-1 p-2">
                <For each={entries()}>
                  {(folder) => (
                    <button
                      type="button"
                      onClick={() => openFolder(folder)}
                      class="flex flex-col items-center gap-1.5 p-2 rounded-xl
                             hover:bg-overlay transition-colors text-center"
                    >
                      <div class="relative">
                        <svg class={`w-10 h-10 ${iconColor(folder)}`} fill="currentColor" viewBox="0 0 24 24">
                          <path d={iconPath(folder)} />
                        </svg>
                        <Show when={folder.count > 0}>
                          <span
                            class="absolute -top-1 -right-1.5 min-w-[1.1rem] h-4 rounded-full text-[9px] font-bold
                                   flex items-center justify-center px-1 tabular-nums bg-accent text-surface"
                          >
                            {folder.count}
                          </span>
                        </Show>
                      </div>
                      <span class="text-[11px] text-txt truncate max-w-full w-full">{folder.name}</span>
                    </button>
                  )}
                </For>
              </div>
            }
          >
            <For each={entries()}>
              {(folder) => (
                <>
                  <button
                    type="button"
                    onClick={() => openFolder(folder)}
                    class="w-full text-left px-3.5 py-2 flex items-center gap-2.5
                           hover:bg-overlay transition-colors"
                  >
                    <svg class={`w-5 h-5 shrink-0 ${iconColor(folder)}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d={iconPath(folder)} />
                    </svg>
                    <span class="flex-1 text-[13px] text-txt truncate">{folder.name}</span>
                    <Show when={folder.count > 0}>
                      <span class="text-[10px] text-muted tabular-nums shrink-0">{folder.count}</span>
                    </Show>
                  </button>
                  <div class="mx-3.5 h-px bg-rim" />
                </>
              )}
            </For>
          </Show>
        </Show>
      </div>

      <Show when={selectedFolder()}>
        {(folder) => (
          <FolderMessagesModal
            title={folder().name}
            feedType={folder().special === "starred" ? "starred" : "folder"}
            file={folder().special === "starred" ? undefined : folder().name}
            onClose={() => setSelectedFolder(null)}
          />
        )}
      </Show>
    </div>
  );
}
