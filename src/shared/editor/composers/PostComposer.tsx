import { Show } from "solid-js";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import { postToWall } from "@/shared/lib/post-api"; // see note below
// import { profileUid } from "@/modules/network/store/store";

interface Props {
  profileUid: number;
  onPosted?: () => void;
}

export default function PostComposer(props: Props) {
  const caps = CAPABILITIES.post;
  const store = createComposerStore(
    async (body, meta) => {
      await postToWall({
        body,
        mimetype: meta.mimetype ?? "text/bbcode",
        profile_uid: props.profileUid,
        title: meta.title ?? "",
      });
      props.onPosted?.();
    },
    "hq:post",
  );

  return (
    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <Show when={caps.title}>
        <input
          type="text"
          placeholder="Title (optional)"
          value={store.title()}
          onInput={(e) => store.setTitle(e.currentTarget.value)}
          class="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                 bg-transparent outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </Show>
      <RichEditor
        body={store.body()}
        onInput={store.setBody}
        capabilities={caps}
        tab={store.tab()}
        onTabChange={store.setTab}
        placeholder="What's on your mind?"
      />
      <div class="flex justify-end">
        <button
          onClick={() => store.submit()}
          disabled={store.submitting() || !store.body().trim()}
          class="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white
                 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {store.submitting() ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
