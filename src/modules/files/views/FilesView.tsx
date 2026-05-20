import {
  createSignal,
  createMemo,
  createResource,
  For,
  Show,
  type Component,
} from "solid-js";
import { useParams } from "@solidjs/router";
import { MdFillFolder, MdFillDelete, MdFillAdd, MdFillLock, MdFillLock_open } from "solid-icons/md";
import { useAuth } from "@/shared/store/auth-store";
import { fetchGroups } from "@/modules/directory/groups/api";
import type { PrivacyGroup } from "@/modules/directory/groups/api";
import {
  listFolder,
  updatePermissions,
  uploadFile,
  deleteItem,
  createFolder,
  davDirPath,
  davPath,
} from "../api";
import type { FileMeta, FileAcl } from "../api";

type ViewMode = "list" | "grid";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function formatDate(s: string): string {
  if (!s || s.startsWith("0001")) return "—";
  try {
    return new Date(s).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return s; }
}

function fileEmoji(item: FileMeta): string {
  if (item.is_dir) return "📁";
  const ct = item.filetype;
  if (ct.startsWith("image/")) return "🖼";
  if (ct.startsWith("video/")) return "🎬";
  if (ct.startsWith("audio/")) return "🎵";
  if (ct === "application/pdf") return "📄";
  if (ct.includes("zip") || ct.includes("tar")) return "🗜";
  if (ct.startsWith("text/")) return "📝";
  return "📎";
}

function isPrivate(acl: FileAcl): boolean {
  return acl.allow_gid.length > 0 || acl.allow_cid.length > 0 ||
         acl.deny_gid.length > 0  || acl.deny_cid.length > 0;
}

// ── Nav stack ─────────────────────────────────────────────────────────────────

type FolderFrame = { hash: string; displayPath: string; label: string };

// ── Permissions panel ─────────────────────────────────────────────────────────

const PermissionsPanel: Component<{
  item: FileMeta;
  nick: string;
  groups: PrivacyGroup[];
  onSaved: (updated: FileMeta) => void;
  onClose: () => void;
}> = (props) => {
  const [allowGid, setAllowGid] = createSignal<string[]>(props.item.acl.allow_gid);
  const [recurse,  setRecurse]  = createSignal(false);
  const [busy,     setBusy]     = createSignal(false);
  const [err,      setErr]      = createSignal("");

  const restricted = createMemo(() => allowGid().length > 0);

  function toggleGroup(hash: string) {
    setAllowGid((p) =>
      p.includes(hash) ? p.filter((h) => h !== hash) : [...p, hash]
    );
  }

  async function save(e: Event) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const updated = await updatePermissions(
        props.nick,
        props.item.hash,
        {
          allow_gid: allowGid(),
          allow_cid: props.item.acl.allow_cid,
          deny_gid:  props.item.acl.deny_gid,
          deny_cid:  props.item.acl.deny_cid,
        },
        recurse()
      );
      props.onSaved(updated);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="mt-1 mb-2 mx-1 rounded-xl border border-rim bg-elevated px-4 py-4 space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-txt">
          Permissions — <span class="font-normal text-muted">{props.item.filename}</span>
        </p>
        <button onClick={props.onClose} class="text-muted hover:text-txt text-lg leading-none">
          ×
        </button>
      </div>

      {/* Visibility badge */}
      <div class={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${
        restricted()
          ? "border-accent/40 bg-accent-muted text-accent"
          : "border-green-500/40 bg-green-500/10 text-green-600"
      }`}>
        <Show when={restricted()} fallback={<MdFillLock_open size={14} />}>
          <MdFillLock size={14} />
        </Show>
        {restricted()
          ? "Restricted — only selected groups can view"
          : "Public — anyone with storage access can view"}
      </div>

      {/* Privacy group checkboxes */}
      <Show when={props.groups.length > 0} fallback={
        <p class="text-sm text-muted">No privacy groups. Create one in Directory → Privacy Groups.</p>
      }>
        <div class="space-y-1.5">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Allow access to</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <For each={props.groups}>
              {(g) => (
                <label class={`flex items-center gap-2.5 px-3 py-2 rounded-lg border
                               cursor-pointer text-sm transition-colors select-none ${
                  allowGid().includes(g.hash)
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-rim text-txt hover:bg-overlay"
                }`}>
                  <input
                    type="checkbox"
                    checked={allowGid().includes(g.hash)}
                    onChange={() => toggleGroup(g.hash)}
                    class="accent-[var(--accent)] w-3.5 h-3.5"
                  />
                  {g.name}
                </label>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Recurse for folders */}
      <Show when={props.item.is_dir}>
        <label class="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={recurse()}
            onChange={(e) => setRecurse(e.currentTarget.checked)}
            class="accent-[var(--accent)]"
          />
          Apply to all files and sub-folders
        </label>
      </Show>

      <Show when={err()}>
        <p class="text-sm text-red-500">{err()}</p>
      </Show>

      <div class="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={busy()}
          class="px-4 py-1.5 rounded-lg bg-accent text-accent-txt text-sm
                 disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {busy() ? "Saving…" : "Save"}
        </button>
        <button
          onClick={props.onClose}
          class="px-4 py-1.5 rounded-lg border border-rim text-sm text-muted
                 hover:bg-overlay transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// ── File row ──────────────────────────────────────────────────────────────────

const FileRow: Component<{
  item: FileMeta;
  nick: string;
  onOpen: (item: FileMeta) => void;
  onDelete: (item: FileMeta) => void;
  onPermissions: (item: FileMeta) => void;
  deleting: boolean;
  permOpen: boolean;
}> = (props) => (
  <div class={`flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-colors ${
    props.permOpen ? "bg-elevated" : "hover:bg-elevated"
  }`}>
    <span class="text-xl shrink-0 select-none">{fileEmoji(props.item)}</span>

    <div class="flex-1 min-w-0">
      <button
        onClick={() => props.onOpen(props.item)}
        class={`text-sm font-medium text-left truncate w-full ${
          props.item.is_dir ? "text-accent hover:underline" : "text-txt"
        }`}
      >
        {props.item.filename}
      </button>
    </div>

    {/* ACL badge */}
    <span class={`hidden sm:flex items-center gap-1 text-xs shrink-0 ${
      isPrivate(props.item.acl) ? "text-accent" : "text-muted"
    }`}>
      {isPrivate(props.item.acl)
        ? <><MdFillLock size={11} /> Restricted</>
        : <><MdFillLock_open size={11} /> Public</>
      }
    </span>

    <span class="hidden sm:block text-xs text-muted w-20 text-right shrink-0">
      {props.item.is_dir ? "—" : formatSize(props.item.filesize)}
    </span>

    <span class="hidden md:block text-xs text-muted w-28 text-right shrink-0">
      {formatDate(props.item.created)}
    </span>

    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      {/* Permissions */}
      <button
        onClick={() => props.onPermissions(props.item)}
        class={`p-1.5 rounded transition-colors ${
          props.permOpen
            ? "text-accent bg-accent-muted"
            : "text-muted hover:text-txt hover:bg-overlay"
        }`}
        title="Permissions"
      >
        <MdFillLock size={14} />
      </button>

      {/* Download */}
      <Show when={!props.item.is_dir}>
        <a
          href={davPath(props.nick, props.item.display_path)}
          download={props.item.filename}
          class="p-1.5 rounded text-muted hover:text-txt hover:bg-overlay transition-colors"
          title="Download"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      </Show>

      {/* Delete */}
      <button
        onClick={() => props.onDelete(props.item)}
        disabled={props.deleting}
        class="p-1.5 rounded text-muted hover:text-red-500 hover:bg-accent-muted
               disabled:opacity-40 transition-colors"
        title="Delete"
      >
        <MdFillDelete size={14} />
      </button>
    </div>
  </div>
);

// ── Breadcrumb ────────────────────────────────────────────────────────────────

const Breadcrumb: Component<{
  stack: FolderFrame[];
  onNavigate: (idx: number) => void;
}> = (props) => (
  <nav class="flex items-center gap-1 text-sm flex-wrap min-w-0">
    <For each={props.stack}>
      {(frame, i) => (
        <>
          <Show when={i() > 0}>
            <span class="text-muted shrink-0">/</span>
          </Show>
          <Show
            when={i() < props.stack.length - 1}
            fallback={<span class="font-medium text-txt truncate">{frame.label}</span>}
          >
            <button
              onClick={() => props.onNavigate(i())}
              class="text-accent hover:underline shrink-0"
            >
              {frame.label}
            </button>
          </Show>
        </>
      )}
    </For>
  </nav>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div class="space-y-1 animate-pulse">
      <For each={Array(7).fill(0)}>
        {() => (
          <div class="flex items-center gap-3 px-3 py-2.5">
            <div class="w-6 h-6 rounded bg-overlay shrink-0" />
            <div class="flex-1 h-3.5 bg-overlay rounded" />
            <div class="hidden sm:block w-16 h-3 bg-overlay rounded" />
            <div class="hidden sm:block w-20 h-3 bg-overlay rounded" />
            <div class="hidden md:block w-24 h-3 bg-overlay rounded" />
          </div>
        )}
      </For>
    </div>
  );
}

// ── Thumbnail grid ────────────────────────────────────────────────────────────

const ThumbnailGrid: Component<{
  files: FileMeta[];
  nick: string;
  deleting: string | null;
  permItem: FileMeta | null;
  onOpen: (item: FileMeta) => void;
  onDelete: (item: FileMeta) => void;
  onPermissions: (item: FileMeta) => void;
}> = (props) => (
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
    <For each={props.files}>
      {(item) => {
        const isImage = () => item.filetype.startsWith("image/");
        const isActive = () => props.permItem?.hash === item.hash;
        return (
          <div
            class={`relative group rounded-xl border overflow-hidden cursor-pointer
                    transition-colors bg-elevated ${
              isActive() ? "border-accent" : "border-rim hover:border-accent/50"
            }`}
            onClick={() => props.onOpen(item)}
          >
            {/* Thumbnail or icon */}
            <div class="aspect-square w-full flex items-center justify-center overflow-hidden bg-overlay">
              <Show
                when={isImage()}
                fallback={
                  <span class="text-5xl select-none">{fileEmoji(item)}</span>
                }
              >
                <img
                  src={davPath(props.nick, item.display_path)}
                  alt={item.filename}
                  loading="lazy"
                  class="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute("style");
                  }}
                />
                {/* fallback shown if img errors */}
                <span class="text-5xl select-none hidden">{fileEmoji(item)}</span>
              </Show>
            </div>

            {/* Filename bar */}
            <div class="px-2 py-1.5 border-t border-rim/50 bg-elevated">
              <p class="text-xs font-medium text-txt truncate">{item.filename}</p>
              <Show when={!item.is_dir}>
                <p class="text-[10px] text-muted">{formatSize(item.filesize)}</p>
              </Show>
            </div>

            {/* Hover action overlay — pointer-events-none so clicks pass through to card */}
            <div
              class="absolute inset-0 flex items-start justify-end p-1.5 gap-1
                     opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            >
              <button
                onClick={(e) => { e.stopPropagation(); props.onPermissions(item); }}
                class={`p-1 rounded-md backdrop-blur-sm text-xs transition-colors pointer-events-auto ${
                  isActive()
                    ? "bg-accent text-accent-txt"
                    : "bg-surface/80 text-muted hover:text-txt"
                }`}
                title="Permissions"
              >
                <MdFillLock size={13} />
              </button>

              <Show when={!item.is_dir}>
                <a
                  href={davPath(props.nick, item.display_path)}
                  download={item.filename}
                  onClick={(e) => e.stopPropagation()}
                  class="p-1 rounded-md bg-surface/80 backdrop-blur-sm text-muted
                         hover:text-txt transition-colors pointer-events-auto"
                  title="Download"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </Show>

              <button
                onClick={(e) => { e.stopPropagation(); props.onDelete(item); }}
                disabled={props.deleting === item.hash}
                class="p-1 rounded-md bg-surface/80 backdrop-blur-sm text-muted
                       hover:text-red-500 disabled:opacity-40 transition-colors pointer-events-auto"
                title="Delete"
              >
                <MdFillDelete size={13} />
              </button>
            </div>

            {/* Private badge */}
            <Show when={isPrivate(item.acl)}>
              <div class="absolute bottom-8 left-1.5 flex items-center gap-0.5
                          bg-surface/80 backdrop-blur-sm text-accent text-[9px]
                          px-1.5 py-0.5 rounded-full">
                <MdFillLock size={9} />
                Restricted
              </div>
            </Show>
          </div>
        );
      }}
    </For>
  </div>
);

// ── View mode icons ───────────────────────────────────────────────────────────

function ListIcon() {
  return (
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function FilesView() {
  const params = useParams();
  const auth   = useAuth();
  const nick   = () => params.nick ?? auth()?.nick ?? "";

  // Navigation stack — start at root
  const [navStack, setNavStack] = createSignal<FolderFrame[]>([
    { hash: "", displayPath: "", label: nick() },
  ]);
  const current = createMemo(() => navStack()[navStack().length - 1]);

  // File listing — refetches whenever current folder hash changes
  const [files, { refetch }] = createResource(
    () => ({ nick: nick(), hash: current().hash }),
    ({ nick: n, hash }) => listFolder(n, hash)
  );

  // Local override for optimistic updates (permissions save)
  const [overrides, setOverrides] = createSignal<Map<string, FileMeta>>(new Map());

  const displayFiles = createMemo(() =>
    (files() ?? []).map((f) => overrides().get(f.hash) ?? f)
  );

  function navigateInto(item: FileMeta) {
    setNavStack((prev) => [
      ...prev,
      { hash: item.hash, displayPath: item.display_path, label: item.filename },
    ]);
    setPermItem(null);
  }

  function navigateTo(idx: number) {
    setNavStack((prev) => prev.slice(0, idx + 1));
    setPermItem(null);
  }

  // DAV base path for the current folder (upload / mkdir)
  const davBase = createMemo(() => davDirPath(nick(), current().displayPath));

  // New folder
  const [showNewFolder, setShowNewFolder] = createSignal(false);
  const [folderName,    setFolderName]    = createSignal("");
  const [folderBusy,    setFolderBusy]    = createSignal(false);

  // Upload
  const [uploadPct, setUploadPct] = createSignal<number | null>(null);
  const [uploadErr, setUploadErr] = createSignal("");

  // Delete
  const [deleting, setDeleting] = createSignal<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = createSignal<ViewMode>(
    (localStorage.getItem("hz-files-view") as ViewMode) ?? "list"
  );
  function toggleViewMode() {
    const next: ViewMode = viewMode() === "list" ? "grid" : "list";
    setViewMode(next);
    localStorage.setItem("hz-files-view", next);
  }

  // Permissions
  const [permItem, setPermItem] = createSignal<FileMeta | null>(null);
  const [groups]                = createResource(fetchGroups);

  async function handleDelete(item: FileMeta) {
    const label = item.is_dir ? `folder "${item.filename}"` : `"${item.filename}"`;
    if (!confirm(`Delete ${label}?`)) return;
    setDeleting(item.hash);
    try {
      await deleteItem(nick(), item.display_path);
      refetch();
    } catch (e) {
      alert(`Delete failed: ${(e as Error).message}`);
    } finally {
      setDeleting(null);
    }
  }

  async function handleCreateFolder(e: Event) {
    e.preventDefault();
    const name = folderName().trim();
    if (!name) return;
    setFolderBusy(true);
    try {
      await createFolder(davBase(), name);
      setFolderName("");
      setShowNewFolder(false);
      refetch();
    } catch (err) {
      alert(`Could not create folder: ${(err as Error).message}`);
    } finally {
      setFolderBusy(false);
    }
  }

  async function handleUpload(e: Event) {
    const fileList = (e.currentTarget as HTMLInputElement).files;
    if (!fileList?.length) return;
    setUploadErr("");
    for (const file of Array.from(fileList)) {
      setUploadPct(0);
      try {
        await uploadFile(davBase(), file, setUploadPct);
      } catch (err) {
        setUploadErr(`Upload failed: ${(err as Error).message}`);
      }
    }
    setUploadPct(null);
    refetch();
    (e.currentTarget as HTMLInputElement).value = "";
  }

  function handlePermSaved(updated: FileMeta) {
    setOverrides((prev) => new Map(prev).set(updated.hash, updated));
    setPermItem(null);
  }

  return (
    <div class="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4">

      {/* ── Header ── */}
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <Breadcrumb stack={navStack()} onNavigate={navigateTo} />

        <div class="flex items-center gap-2 shrink-0">
          {/* View mode toggle */}
          <button
            onClick={toggleViewMode}
            class="p-1.5 rounded-lg border border-rim text-muted hover:bg-elevated
                   transition-colors"
            title={viewMode() === "list" ? "Switch to grid view" : "Switch to list view"}
          >
            <Show when={viewMode() === "list"} fallback={<ListIcon />}>
              <GridIcon />
            </Show>
          </button>

          <button
            onClick={() => setShowNewFolder((v) => !v)}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rim
                   text-sm text-muted hover:bg-elevated transition-colors"
          >
            <MdFillFolder size={14} />
            New folder
          </button>

          <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent
                        text-accent-txt text-sm cursor-pointer hover:opacity-90 transition-opacity">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload
            <input type="file" multiple class="sr-only" onChange={handleUpload} />
          </label>
        </div>
      </div>

      {/* ── Upload progress ── */}
      <Show when={uploadPct() !== null}>
        <div class="space-y-1">
          <p class="text-xs text-muted">Uploading… {uploadPct()}%</p>
          <div class="h-1 w-full bg-overlay rounded-full overflow-hidden">
            <div class="h-full bg-accent transition-all" style={{ width: `${uploadPct()}%` }} />
          </div>
        </div>
      </Show>
      <Show when={uploadErr()}>
        <p class="text-sm text-red-500">{uploadErr()}</p>
      </Show>

      {/* ── New folder form ── */}
      <Show when={showNewFolder()}>
        <form onSubmit={handleCreateFolder} class="flex gap-2">
          <input
            type="text"
            autofocus
            placeholder="Folder name…"
            value={folderName()}
            onInput={(e) => setFolderName(e.currentTarget.value)}
            class="flex-1 px-3 py-2 rounded-lg border border-rim bg-surface text-sm text-txt
                   placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            disabled={folderBusy() || !folderName().trim()}
            class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-accent-txt
                   text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <MdFillAdd size={14} />
            {folderBusy() ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => { setShowNewFolder(false); setFolderName(""); }}
            class="px-3 py-2 rounded-lg border border-rim text-sm text-muted
                   hover:bg-elevated transition-colors"
          >
            Cancel
          </button>
        </form>
      </Show>

      {/* ── Column labels (list mode only) ── */}
      <Show when={viewMode() === "list"}>
        <div class="border-t border-rim" />
        <div class="flex items-center gap-3 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
          <span class="w-6 shrink-0" />
          <span class="flex-1">Name</span>
          <span class="hidden sm:block w-20 shrink-0 text-right">Access</span>
          <span class="hidden sm:block w-20 shrink-0 text-right">Size</span>
          <span class="hidden md:block w-28 shrink-0 text-right">Created</span>
          <span class="w-20 shrink-0" />
        </div>
      </Show>

      {/* ── File list / grid ── */}
      <Show when={!files.loading} fallback={<Skeleton />}>
        <Show
          when={!files.error}
          fallback={
            <div class="py-10 text-center space-y-2">
              <p class="text-sm text-red-500">Failed to load files.</p>
              <p class="text-xs text-muted">{String(files.error)}</p>
              <button onClick={() => refetch()} class="text-xs text-accent hover:underline">
                Retry
              </button>
            </div>
          }
        >
          <Show
            when={displayFiles().length > 0}
            fallback={<p class="py-12 text-center text-sm text-muted">This folder is empty.</p>}
          >
            <Show
              when={viewMode() === "list"}
              fallback={
                <>
                  <ThumbnailGrid
                    files={displayFiles()}
                    nick={nick()}
                    deleting={deleting()}
                    permItem={permItem()}
                    onOpen={(it) => it.is_dir
                      ? navigateInto(it)
                      : window.open(davPath(nick(), it.display_path), "_blank")}
                    onDelete={handleDelete}
                    onPermissions={(it) =>
                      setPermItem((prev) => (prev?.hash === it.hash ? null : it))
                    }
                  />
                  {/* Permissions panel for grid mode — centered modal */}
                  <Show when={permItem()}>
                    <div
                      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                      onClick={() => setPermItem(null)}
                    >
                      <div class="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <PermissionsPanel
                          item={permItem()!}
                          nick={nick()}
                          groups={groups() ?? []}
                          onSaved={handlePermSaved}
                          onClose={() => setPermItem(null)}
                        />
                      </div>
                    </div>
                  </Show>
                </>
              }
            >
              <div class="space-y-0.5">
                <For each={displayFiles()}>
                  {(item) => (
                    <>
                      <FileRow
                        item={item}
                        nick={nick()}
                        onOpen={(it) => it.is_dir ? navigateInto(it) : window.open(davPath(nick(), it.display_path), "_blank")}
                        onDelete={handleDelete}
                        onPermissions={(it) =>
                          setPermItem((prev) => (prev?.hash === it.hash ? null : it))
                        }
                        deleting={deleting() === item.hash}
                        permOpen={permItem()?.hash === item.hash}
                      />
                      <Show when={permItem()?.hash === item.hash}>
                        <PermissionsPanel
                          item={item}
                          nick={nick()}
                          groups={groups() ?? []}
                          onSaved={handlePermSaved}
                          onClose={() => setPermItem(null)}
                        />
                      </Show>
                    </>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </Show>
      </Show>

    </div>
  );
}
