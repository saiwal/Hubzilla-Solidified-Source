// src/modules/wiki/views/WikiPagesView.tsx
// Thin redirect: /:nick/:wikiName → /:nick/:wikiName/Home
// No data loading here — WikiPageView owns all fetching.
import { useParams, useNavigate } from "@solidjs/router";
import { onMount } from "solid-js";

export default function WikiPagesView() {
  const params   = useParams<{ nick: string; wikiName: string }>();
  const navigate = useNavigate();

  onMount(() => {
    navigate(`/wiki/${params.nick}/${params.wikiName}/Home`, { replace: true });
  });

  return null;
}
