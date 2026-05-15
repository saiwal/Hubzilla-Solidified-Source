// src/modules/wiki/views/WikiPagesView.tsx
import { createEffect, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { pagesLoading, loadWikiPages } from "../store";

export default function WikiPagesView() {
  const params   = useParams<{ nick: string; wikiName: string }>();
  const navigate = useNavigate();

  createEffect(() => {
    const { nick, wikiName } = params;
    if (nick && wikiName) {
      loadWikiPages(nick, wikiName).then(() => {
        navigate(`/wiki/${nick}/${wikiName}/Home`, { replace: true });
      });
    }
  });

  return (
    <div class="flex items-center justify-center h-40">
      <Show when={pagesLoading()}>
        <span class="text-muted text-sm">Loading…</span>
      </Show>
    </div>
  );
}
