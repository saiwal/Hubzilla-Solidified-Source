// src/modules/wiki/views/WikiListView.tsx
import { createEffect, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { wikis, wikisLoading, canCreate, wikisError, loadWikis, resetWikis } from "../store";
import { createWiki } from "../api";
import { createSignal } from "solid-js";

export default function WikiListView() {
  const params = useParams<{ nick: string }>();
  const [creating, setCreating] = createSignal(false);
  const [newName, setNewName]   = createSignal("");
  const [newMime, setNewMime]   = createSignal<"text/markdown" | "text/bbcode" | "text/plain">("text/markdown");
  const [busy, setBusy]         = createSignal(false);
  const [error, setError]       = createSignal("");

  createEffect(() => {
    const nick = params.nick;
    if (nick) loadWikis(nick);
  });

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!newName().trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await createWiki(params.nick, {
        name: newName().trim(),
        mime_type: newMime(),
      });
      if (res.success) {
        setCreating(false);
        setNewName("");
        resetWikis();              // force reload
        loadWikis(params.nick);
      }
    } catch (err: any) {
      setError(err.message ?? "Error creating wiki");
    } finally {
      setBusy(false);
    }
  }

  const mimeOptions: { value: "text/markdown" | "text/bbcode" | "text/plain"; label: string }[] = [
    { value: "text/markdown", label: "Markdown" },
    { value: "text/bbcode",   label: "BBcode"   },
    { value: "text/plain",    label: "Plain text"},
  ];

  return (
    <div class="space-y-4 max-w-2xl mx-auto p-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold text-txt">Wikis</h1>
        <Show when={canCreate()}>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            class="text-sm border border-rim text-muted hover:bg-elevated px-3 py-1.5 rounded-lg transition-colors"
          >
            {creating() ? "Cancel" : "New Wiki"}
          </button>
        </Show>
      </div>

      {/* Create form */}
      <Show when={creating()}>
        <form
          class="bg-surface border border-rim rounded-xl p-4 space-y-3"
          onSubmit={handleCreate}
        >
          <div class="space-y-1">
            <label class="text-xs text-muted font-medium">Wiki name</label>
            <input
              type="text"
              class="w-full bg-surface border border-rim text-txt rounded-lg px-3 py-2 text-sm
                     hover:border-rim-strong focus:outline-none"
              placeholder="My Wiki"
              value={newName()}
              onInput={(e) => setNewName(e.currentTarget.value)}
              required
            />
          </div>
          <div class="space-y-1">
            <label class="text-xs text-muted font-medium">Content type</label>
            <select
              class="w-full bg-surface border border-rim text-txt rounded-lg px-3 py-2 text-sm
                     hover:border-rim-strong focus:outline-none"
              value={newMime()}
              onChange={(e) => setNewMime(e.currentTarget.value as any)}
            >
              <For each={mimeOptions}>
                {(opt) => <option value={opt.value}>{opt.label}</option>}
              </For>
            </select>
          </div>
          <Show when={error()}>
            <p class="text-sm text-red-400">{error()}</p>
          </Show>
          <button
            type="submit"
            disabled={busy()}
            class="bg-accent-muted text-accent px-4 py-2 rounded-lg text-sm
                   hover:bg-elevated disabled:opacity-50 transition-colors"
          >
            {busy() ? "Creating…" : "Create Wiki"}
          </button>
        </form>
      </Show>

      {/* Loading */}
      <Show when={wikisLoading()}>
        <div class="space-y-2">
          <For each={[1, 2, 3]}>
            {() => (
              <div class="bg-surface border border-rim rounded-xl p-4 h-16 animate-pulse" />
            )}
          </For>
        </div>
      </Show>

      {/* Permission denied */}
      <Show when={!wikisLoading() && wikisError() === "permission"}>
        <p class="text-muted text-sm text-center py-8">You don't have permission to view these wikis.</p>
      </Show>

      {/* Empty */}
      <Show when={!wikisLoading() && !wikisError() && wikis().length === 0}>
        <p class="text-muted text-sm text-center py-8">No wikis yet.</p>
      </Show>

      {/* List */}
      <Show when={!wikisLoading() && !wikisError() && wikis().length > 0}>
        <ul class="space-y-2">
          <For each={wikis()}>
            {(wiki) => (
              <li>
                <A
                  href={`/wiki/${params.nick}/${wiki.url_name}`}
                  class="flex items-center justify-between bg-surface border border-rim rounded-xl px-4 py-3
                         hover:border-rim-strong hover:bg-elevated transition-colors group"
                >
                  <span class="font-medium text-txt group-hover:text-accent transition-colors">
                    {wiki.name}
                  </span>
                  <span class="text-xs text-muted">
                    {wiki.mime_type.replace("text/", "")}
                  </span>
                </A>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
