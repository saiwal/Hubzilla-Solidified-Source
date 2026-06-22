import { createEffect, createSignal, Show, For } from "solid-js";
import { useParams } from "@solidjs/router";
import { useAuth } from "@/shared/store/auth-store";
import { useViewerRole } from "@/shared/store/site-config";
import { useI18n } from "@/i18n";
import DOMPurify from "dompurify";
import { bbcodeToHtml } from "@/shared/lib/bbcode";
import NoteComposer from "@/shared/editor/composers/NoteComposer";
import { notes, loading, hasMore, loadNotes, removeNote } from "../store";
import type { Note } from "../api";

function renderBody(body: string, mimetype: string): string {
  switch (mimetype) {
    case "text/bbcode":
      return DOMPurify.sanitize(bbcodeToHtml(body));
    case "text/html":
      return DOMPurify.sanitize(body);
    default:
      return DOMPurify.sanitize(body);
  }
}

function fmtDate(iso: string): string {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function NoteCard(props: {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  confirmingDelete: boolean;
  onCancelDelete: () => void;
}) {
  const { t } = useI18n();

  return (
    <div class="bg-surface border border-rim rounded-xl p-4 space-y-3 group hover:border-rim-strong transition-colors">
      <div
        class="prose prose-sm dark:prose-invert max-w-none text-txt leading-relaxed
               [&_a]:text-accent [&_a]:no-underline [&_a:hover]:underline
               line-clamp-6"
        innerHTML={renderBody(props.note.body, props.note.mimetype)}
      />
      <div class="flex items-center justify-between text-xs text-muted">
        <span>{fmtDate(props.note.edited || props.note.created)}</span>

        <Show
          when={!props.confirmingDelete}
          fallback={
            <span class="inline-flex gap-2 items-center">
              <span>{t("notes.delete_confirm")}</span>
              <button
                onClick={props.onDelete}
                class="px-2 py-0.5 rounded bg-red-600 text-white text-xs hover:bg-red-700 transition-colors"
              >
                {t("notes.delete")}
              </button>
              <button
                onClick={props.onCancelDelete}
                class="px-2 py-0.5 rounded border border-rim text-muted hover:bg-elevated transition-colors"
              >
                {t("notes.cancel")}
              </button>
            </span>
          }
        >
          <span class="inline-flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={props.onEdit}
              class="px-2 py-0.5 rounded border border-rim text-muted hover:bg-elevated transition-colors"
            >
              {t("notes.edit")}
            </button>
            <button
              onClick={props.onDelete}
              class="px-2 py-0.5 rounded border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
            >
              {t("notes.delete")}
            </button>
          </span>
        </Show>
      </div>
    </div>
  );
}

export default function NotesView() {
  const { t } = useI18n();
  const params = useParams<{ nick: string }>();
  const auth = useAuth();
  const role = useViewerRole();

  const [editingNote, setEditingNote] = createSignal<Note | null>(null);
  const [confirmMid, setConfirmMid] = createSignal<string | null>(null);

  const nick = () => params.nick || auth()?.nick || "";
  const isOwner = () => role() === "owner";

  createEffect(() => {
    if (!auth.loading && nick()) {
      loadNotes(true);
    }
  });

  return (
    <div class="max-w-2xl mx-auto space-y-6">
      <h1 class="text-xl font-bold text-txt">{t("notes.title")}</h1>

      {/* Compose area — owner only */}
      <Show when={isOwner()}>
        <Show
          when={editingNote() === null}
          fallback={
            <div class="bg-surface border border-accent/30 rounded-xl p-4">
              <NoteComposer
                nick={nick()}
                initial={{
                  mid:      editingNote()!.mid,
                  body:     editingNote()!.body,
                  mimetype: editingNote()!.mimetype,
                }}
                onSaved={() => { setEditingNote(null); loadNotes(true); }}
                onCancel={() => setEditingNote(null)}
              />
            </div>
          }
        >
          <div class="bg-surface border border-rim rounded-xl p-4">
            <NoteComposer
              nick={nick()}
              onSaved={() => loadNotes(true)}
            />
          </div>
        </Show>
      </Show>

      {/* Loading skeleton */}
      <Show when={loading() && notes().length === 0}>
        <div class="space-y-3">
          <For each={Array(3).fill(0)}>
            {() => (
              <div class="bg-surface border border-rim rounded-xl p-4 space-y-2 animate-pulse">
                <div class="h-3 bg-elevated rounded w-full" />
                <div class="h-3 bg-elevated rounded w-5/6" />
                <div class="h-3 bg-elevated rounded w-4/6" />
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={!loading() && notes().length === 0}>
        <div class="text-center py-16 space-y-3 text-muted">
          <p class="text-3xl">📝</p>
          <p class="text-sm">{t("notes.no_notes")}</p>
          <Show when={isOwner()}>
            <p class="text-xs">{t("notes.create_first")}</p>
          </Show>
        </div>
      </Show>

      <Show when={notes().length > 0}>
        <div class="space-y-3">
          <For each={notes()}>
            {(note) => (
              <NoteCard
                note={note}
                onEdit={() => { setConfirmMid(null); setEditingNote(note); }}
                onDelete={() => {
                  if (confirmMid() === note.mid) {
                    setConfirmMid(null);
                    removeNote(note.mid);
                  } else {
                    setConfirmMid(note.mid);
                  }
                }}
                confirmingDelete={confirmMid() === note.mid}
                onCancelDelete={() => setConfirmMid(null)}
              />
            )}
          </For>
        </div>

        <Show when={hasMore()}>
          <div class="flex justify-center">
            <button
              onClick={() => loadNotes(false)}
              disabled={loading()}
              class="px-4 py-2 text-sm rounded-lg border border-rim bg-surface text-muted
                     hover:bg-elevated transition-colors disabled:opacity-40"
            >
              {loading() ? "…" : t("notes.load_more")}
            </button>
          </div>
        </Show>
      </Show>
    </div>
  );
}
