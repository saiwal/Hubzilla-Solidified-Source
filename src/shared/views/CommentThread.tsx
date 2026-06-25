import { For, Show } from "solid-js";
import type { ThreadNode } from "../lib/thread";
import { isDeletedStub } from "../lib/thread";
import type { StreamHandlers } from "../stream/types";
import PostCard from "../stream/components/PostCard";
import { useI18n } from "@/i18n";

export default function CommentThread(props: {
  comments: ThreadNode[];
  show: boolean;
  handlers: StreamHandlers;
  threaded?: boolean;
  highlightUuid?: string;
  postAuthorAddress?: string;
  expandAll?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div
      style={{
        display: "grid",
        "grid-template-rows": props.show ? "1fr" : "0fr",
        transition: "grid-template-rows 300ms ease",
      }}
    >
      <div style={{ overflow: "hidden" }}>
        <div class="mt-2 ml-1 space-y-1.5">
          <For each={props.comments}>
            {(comment) => (
              <Show
                when={!isDeletedStub(comment)}
                fallback={
                  <div>
                    <div class="border-l-2 border-dashed border-rim/40 pl-2 md:pl-3 py-2">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-elevated shrink-0" />
                        <span class="text-xs text-muted italic">{t("post.deleted_comment")}</span>
                      </div>
                    </div>
                    <Show when={comment.children.length > 0}>
                      <CommentThread
                        comments={comment.children}
                        show={props.show}
                        handlers={props.handlers}
                        highlightUuid={props.highlightUuid}
                        postAuthorAddress={props.postAuthorAddress}
                        expandAll={props.expandAll}
                      />
                    </Show>
                  </div>
                }
              >
                <PostCard
                  post={comment}
                  handlers={props.handlers}
                  compact
                  highlighted={!!props.highlightUuid && comment.uuid === props.highlightUuid}
                  highlightUuid={props.highlightUuid}
                  postAuthorAddress={props.postAuthorAddress}
                  expandAll={props.expandAll}
                />
              </Show>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
