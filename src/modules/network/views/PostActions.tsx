// src/modules/network/views/PostActions.tsx
import { Show } from "solid-js";
import { useAuth } from "@/shared/store/auth-store";
import {
  handleLike,
  handleDislike,
  handleRepeat,
  handleStar,
  handleDelete,
} from "../store/store";
import type { ThreadNode } from "@/shared/lib/thread";

interface Props {
  post: ThreadNode;
}

export default function PostActions(props: Props) {
  const auth = useAuth();
  const isOwner = () => auth()?.uid === props.post.profileUid;

  return (
    <div class="flex items-center gap-3 text-sm text-muted">
      <button
        onClick={() => handleLike(props.post.mid)}
        class={`flex items-center gap-1 transition-colors hover:text-blue-500
          ${props.post.viewerLiked ? "text-blue-500" : ""}`}
      >
        <span>👍</span>
        <Show when={props.post.likeCount > 0}>
          <span>{props.post.likeCount}</span>
        </Show>
      </button>

      <button
        onClick={() => handleDislike(props.post.mid)}
        class={`flex items-center gap-1 transition-colors hover:text-red-500
          ${props.post.viewerDisliked ? "text-red-500" : ""}`}
      >
        <span>👎</span>
        <Show when={props.post.dislikeCount > 0}>
          <span>{props.post.dislikeCount}</span>
        </Show>
      </button>

      <button
        onClick={() => handleRepeat(props.post.mid)}
        class={`flex items-center gap-1 transition-colors hover:text-green-500
          ${props.post.viewerRepeated ? "text-green-500" : ""}`}
      >
        <span>🔁</span>
        <Show when={props.post.repeatCount > 0}>
          <span>{props.post.repeatCount}</span>
        </Show>
      </button>

      <Show when={auth()?.isLoggedIn}>
        <button
          onClick={() => handleStar(props.post.mid)}
          class={`transition-colors hover:text-yellow-500
            ${props.post.flags.includes("starred") ? "text-yellow-500" : ""}`}
        >
          ⭐
        </button>
      </Show>

      <Show when={isOwner()}>
        <button
          onClick={() => handleDelete(props.post.mid)}
          class="transition-colors hover:text-red-600 ml-auto"
        >
          🗑
        </button>
      </Show>
    </div>
  );
}
