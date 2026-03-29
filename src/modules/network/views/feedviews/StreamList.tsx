import { For } from "solid-js";
import type { ThreadNode } from "../../../../shared/hooks/thread";
import PostCard from "../../../../shared/views/PostCard";
import { Match, Switch } from 'solid-js';
import { viewMode } from '../../../network/store/store';
// import FeedView from './views/FeedView';
import MasonryView from '../feedviews/MasonryView';
import ListView from '../feedviews/ListView';
import InboxView from '../feedviews/InboxView';
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
