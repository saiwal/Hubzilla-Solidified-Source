// src/modules/network/views/ReactorList.tsx

import { createResource, Show, For } from 'solid-js';
import { fetchDislikes, fetchLikes, fetchRepeats } from '../api';

interface Props {
  mid: string;
  verb: 'likes' | 'dislikes' | 'repeats';
}

export default function ReactorList(props: Props) {
  const fetcher = () =>
    props.verb === 'likes'    ? fetchLikes(props.mid)    :
    props.verb === 'dislikes' ? fetchDislikes(props.mid) :
                                fetchRepeats(props.mid);

  const [data] = createResource(() => props.mid, fetcher);

  return (
    <Show when={!data.loading} fallback={<p>Loading...</p>}>
      <For each={data()?.reactions ?? []}>
        {(r) => (
          <div class="flex items-center gap-2 py-1">
            <img src={r.photo} class="w-6 h-6 rounded-full" alt="" />
            <span class="text-sm">{r.name}</span>
          </div>
        )}
      </For>
    </Show>
  );
}
