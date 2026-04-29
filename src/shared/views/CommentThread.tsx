import { For } from "solid-js";
import type { ThreadNode } from "../lib/thread";
import type { StreamHandlers } from "../stream/types";
import PostCard from "../stream/components/PostCard";

export default function CommentThread(props: {
  comments: ThreadNode[];
  show: boolean;
  handlers: StreamHandlers;
}) {
  return (
    <div
      style={{
        display: "grid",
        "grid-template-rows": props.show ? "1fr" : "0fr",
        transition: "grid-template-rows 300ms ease",
      }}
    >
      <div style={{ overflow: "hidden" }}>
        <div class="mt-2 ml-2 space-y-1.5">
          <For each={props.comments}>
            {(comment) => (
              <PostCard post={comment} handlers={props.handlers} compact />
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
