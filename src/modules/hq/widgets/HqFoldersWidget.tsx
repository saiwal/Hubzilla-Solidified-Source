import { useI18n } from "@/i18n";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { createSignal, For, Show, lazy, type Component } from "solid-js";
import { FOLDER_ICON_PATH } from "./MessageList";

const FolderMessagesModal = lazy(() => import("./FolderMessagesModal"));

interface FolderInfo {
  name: string;
  count: number;
}

async function fetchFolderCounts(): Promise<FolderInfo[]> {
  const res = await fetch("/api/folders?counts=1");
  if (!res.ok) return [];
  const { data } = await res.json();
  return Array.isArray(data) ? data : [];
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

export default function HqFoldersWidget() {
  const { t } = useI18n();
  const [viewMode, setViewMode] = createSignal<ViewMode>(loadViewMode());
  const [selectedFolder, setSelectedFolder] = createSignal<string | null>(null);
  const [folders] = createQueryResource("hq-folder-counts", () => true, fetchFolderCounts);

  function selectViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  return (
    <div
      class="bg-surface rounded-2xl border border-rim flex flex-col overflow-hidden shadow-sm"
      style={{ height: "300px" }}
    >
      {/* ── Header ── */}
      <div class="px-3.5 pt-3.5 pb-2 shrink-0">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wider text-muted">
            {t("hq.msg_tab_folders")}
          </span>
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
      </div>

      {/* ── Body ── */}
      <div class="flex-1 overflow-y-auto">
        <Show
          when={!folders.loading}
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
            when={(folders() ?? []).length > 0}
            fallback={
              <div class="flex flex-col items-center justify-center h-full gap-2 text-sm text-muted py-16">
                <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={FOLDER_ICON_PATH} />
                </svg>
                <span>{t("hq.no_folders")}</span>
              </div>
            }
          >
            <Show
              when={viewMode() === "list"}
              fallback={
                <div class="grid grid-cols-3 sm:grid-cols-4 gap-1 p-2">
                  <For each={folders() ?? []}>
                    {(folder) => (
                      <button
                        type="button"
                        onClick={() => setSelectedFolder(folder.name)}
                        class="flex flex-col items-center gap-1.5 p-2 rounded-xl
                               hover:bg-overlay transition-colors text-center"
                      >
                        <div class="relative">
                          <svg class="w-10 h-10 text-accent/70" fill="currentColor" viewBox="0 0 24 24">
                            <path d={FOLDER_ICON_PATH} />
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
              <For each={folders() ?? []}>
                {(folder) => (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedFolder(folder.name)}
                      class="w-full text-left px-3.5 py-2 flex items-center gap-2.5
                             hover:bg-overlay transition-colors"
                    >
                      <svg class="w-5 h-5 shrink-0 text-accent/70" fill="currentColor" viewBox="0 0 24 24">
                        <path d={FOLDER_ICON_PATH} />
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
        </Show>
      </div>

      <Show when={selectedFolder()}>
        <FolderMessagesModal folder={selectedFolder()!} onClose={() => setSelectedFolder(null)} />
      </Show>
    </div>
  );
}
