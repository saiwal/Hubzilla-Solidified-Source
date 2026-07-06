// src/modules/network/views/ReactorList.tsx

import { Show, For } from 'solid-js';
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { fetchDislikes, fetchLikes, fetchRepeats } from '../api';
import { useI18n } from "@/i18n";

interface Props {
  mid: string;
  verb: 'likes' | 'dislikes' | 'repeats';
}

export default function ReactorList(props: Props) {
  const { t } = useI18n();
  const [data] = createQueryResource(
    "reactors",
    () => ({ mid: props.mid, verb: props.verb }),
    ({ mid, verb }) =>
      verb === 'likes'    ? fetchLikes(mid)    :
      verb === 'dislikes' ? fetchDislikes(mid) :
                            fetchRepeats(mid),
  );

  return (
    <Show when={!data.loading} fallback={<p>{t("network.loading")}</p>}>
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
