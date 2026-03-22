import { For } from "solid-js";
import type { ThreadNode } from "../core/utils/thread";
import PostCard from "./PostCard";

export default function StreamList(props: { posts: ThreadNode[] }) {
  return (
    <For each={props.posts}>
      {(post) => <PostCard post={post} />}
    </For>
  );
}
