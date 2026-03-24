import { For } from "solid-js";
import type { ThreadNode } from "../core/utils/thread";
import PostCard from "./PostCard";
import { Match, Switch } from 'solid-js';
import { viewMode } from '../modules/network/store';
// import FeedView from './views/FeedView';
import MasonryView from './views/MasonryView';
import ListView from './views/ListView';
import InboxView from './views/InboxView';
// export default function StreamList(props: { posts: ThreadNode[] }) {
//   return (
//     <For each={props.posts}>
//       {(post) => <PostCard post={post} />}
//     </For>
//   );
// }
export default function StreamList(props: { posts: ThreadNode[] }) {
  return (
    <Switch>
      <Match when={viewMode() === 'feed'}>
      <For each={props.posts}>
      {(post) => <PostCard post={post} />}
    </For>
      </Match>
      <Match when={viewMode() === 'masonry'}>
        <MasonryView posts={props.posts} />
      </Match>
      <Match when={viewMode() === 'list'}>
        <ListView posts={props.posts} />
      </Match>
      <Match when={viewMode() === 'inbox'}>
        <InboxView posts={props.posts} />
      </Match>
    </Switch>
  );
}
