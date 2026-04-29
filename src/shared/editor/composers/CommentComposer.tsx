import { Show } from "solid-js";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import { useAuth } from "@/shared/store/auth-store";

interface Props {
  /** mid of the post being replied to — used as localStorage draft scope key */
  parentMid: string;
  /** numeric item id needed for the /item API call */
  parentIid: number;
  /** uid of the channel that owns the thread */
  profileUid: number;
  /** Called after the comment lands on the server so the parent can
   *  prepend an optimistic bubble or refresh its children list. */
  onSubmitted?: (body: string) => void;
}

export default function CommentComposer(props: Props) {
  const auth = useAuth();
  const caps = CAPABILITIES.comment;

  // One store per CommentComposer instance — never module-level
  const store = createComposerStore(
    async (body) => {
      const csrf =
        document.querySelector<HTMLMetaElement>('meta[name="api-token"]')
          ?.content ?? "";

      const params = new URLSearchParams({
        body,
        mimetype: "text/bbcode",
        type: "wall-comment",
        parent: String(props.parentIid),
        profile_uid: String(props.profileUid),
      });

      const res = await fetch("/item", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRF-Token": csrf,
        },
        body: params.toString(),
      });

      if (!res.ok) throw new Error("Comment failed");

      props.onSubmitted?.(body);
    },
    // Scoped draft key — one per thread so drafts survive navigation
    `comment:${props.parentMid}`,
  );

  // Only render for logged-in local users
  if (!auth()?.isLocal) return null;

  return (
    <div class="mt-3 space-y-2">
      {/* Avatar + editor row */}
      <div class="flex gap-2 items-start">
        {/* Small avatar badge */}
        <Show when={auth()?.nick}>
          <div class="w-7 h-7 rounded-full bg-accent-muted text-accent flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
            {auth()!.nick[0].toUpperCase()}
          </div>
        </Show>

        <div class="flex-1 min-w-0">
          <RichEditor
            body={store.body()}
            onInput={store.setBody}
            capabilities={caps}
            tab={store.tab()}
            onTabChange={store.setTab}
            onCtrlEnter={() => store.submit()}
            placeholder="Write a reply… (Ctrl+Enter to send)"
            minHeight="60px"
          />
        </div>
      </div>

      {/* Error banner */}
      <Show when={store.error()}>
        <p class="text-xs text-red-500 pl-9">{store.error()}</p>
      </Show>

      {/* Submit row */}
      <div class="flex justify-end gap-2 pl-9">
        <Show when={store.body().trim()}>
          <button
            type="button"
            onClick={store.reset}
            class="px-3 py-1 text-xs rounded-lg border border-rim text-muted hover:bg-elevated transition-colors"
          >
            Cancel
          </button>
        </Show>
        <button
          type="button"
          onClick={() => store.submit()}
          disabled={store.submitting() || !store.body().trim()}
          class="px-3 py-1 text-xs font-medium rounded-lg bg-accent text-accent-txt
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {store.submitting() ? "Sending…" : "Reply"}
        </button>
      </div>
    </div>
  );
}
