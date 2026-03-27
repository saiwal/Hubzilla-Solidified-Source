import { For } from "solid-js";
import type { ThreadNode } from "../../../core/utils/thread";
import PostCard from "../post/PostCard";

export default function StreamList(props: { posts: ThreadNode[], onLoadOlder: () => void }) {
  return (
		<>
    <For each={props.posts}>
      {(post) => <PostCard post={post} />}
    </For>
			<button onClick={props.onLoadOlder}>
        Load older posts
      </button>
		</>
  );
}
