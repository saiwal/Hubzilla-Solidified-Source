import { For } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import PostCard from "@/shared/views/PostCard";

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
