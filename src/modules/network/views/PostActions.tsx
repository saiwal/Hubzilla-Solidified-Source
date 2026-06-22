// src/modules/network/views/PostActions.tsx
import { Show } from "solid-js";
import { useAuth } from "@/shared/store/auth-store";
import {
  handleLike,
  handleDislike,
  handleRepeat,
  handleStar,
  handleDelete,
} from "../store";
import type { ThreadNode } from "@/shared/lib/thread";
import {
  MdOutlineThumb_up,
  MdOutlineThumb_down,
  MdOutlineRepeat,
  MdOutlineStar,
  MdOutlineDelete,
} from "solid-icons/md";

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
        class={`flex items-center gap-1 transition-colors hover:text-accent
          ${props.post.viewerLiked ? "text-accent" : ""}`}
      >
        <MdOutlineThumb_up class="w-4 h-4" />
        <Show when={props.post.likeCount > 0}>
          <span>{props.post.likeCount}</span>
        </Show>
      </button>

      <button
        onClick={() => handleDislike(props.post.mid)}
        class={`flex items-center gap-1 transition-colors hover:text-red-500
          ${props.post.viewerDisliked ? "text-red-500" : ""}`}
      >
        <MdOutlineThumb_down class="w-4 h-4" />
        <Show when={props.post.dislikeCount > 0}>
          <span>{props.post.dislikeCount}</span>
        </Show>
      </button>

      <button
        onClick={() => handleRepeat(props.post.mid)}
        class={`flex items-center gap-1 transition-colors hover:text-green-500
          ${props.post.viewerRepeated ? "text-green-500" : ""}`}
      >
        <MdOutlineRepeat class="w-4 h-4" />
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
          <MdOutlineStar class="w-4 h-4" />
        </button>
      </Show>

      <Show when={isOwner()}>
        <button
          onClick={() => handleDelete(props.post.mid)}
          class="transition-colors hover:text-red-600 ml-auto"
        >
          <MdOutlineDelete class="w-4 h-4" />
        </button>
      </Show>
    </div>
  );
}
