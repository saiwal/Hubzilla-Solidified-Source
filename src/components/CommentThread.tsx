import { For } from "solid-js";
import type { ThreadNode } from "../core/utils/thread";
import PostCard from "./PostCard";

export default function CommentThread(props: { comments: ThreadNode[] }) {
  return (
    <div class="mt-3 ml-4 pl-4 border-l-2 border-zinc-300 dark:border-zinc-700 space-y-3">
      <For each={props.comments}>
        {(comment) => <PostCard post={comment} />}
      </For>
    </div>
  );
}
