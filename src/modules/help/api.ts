// src/modules/help/api.ts
import { apiFetch } from "@/shared/lib/fetch";

// ── types ─────────────────────────────────────────────────────────────────────

export interface NavNode {
  slug: string;
  label: string;
  path: string;        // topic slug relative to lang root, e.g. "network/advanced"
  hasContent: boolean;
  children: NavNode[];
}

export interface NavResponse {
  tree: NavNode[];
  langs: string[];
  section: string;
  lang: string;
}

export interface TopicResponse {
  html: string;
  title: string;
  topic: string;
  section: string;
  lang: string;
  langs: string[];
}

// ── fetchers ──────────────────────────────────────────────────────────────────

export async function fetchNav(section: string, lang: string): Promise<NavResponse> {
  const res  = await apiFetch(`/api/help/nav?section=${section}&lang=${encodeURIComponent(lang)}`);
  const json = await res.json();
  return (json.data ?? json) as NavResponse;
}

export async function fetchTopic(section: string, lang: string, topic: string): Promise<TopicResponse> {
  const res  = await apiFetch(
    `/api/help/topic?section=${section}&lang=${encodeURIComponent(lang)}&topic=${encodeURIComponent(topic)}`
  );
  const json = await res.json();
  return (json.data ?? json) as TopicResponse;
}
