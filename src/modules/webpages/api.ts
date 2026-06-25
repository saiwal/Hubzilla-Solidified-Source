import { apiFetch } from '@/shared/lib/fetch';

export type WebPage = {
  iid: number;
  mid: string;
  title: string;
  pagelink: string;
  mimetype: string;
  created: string;
  edited: string;
  is_private: boolean;
  view_url: string;
  edit_url: string;
};

export type WebPageDetail = {
  uuid: string;
  mid: string;
  title: string;
  summary: string;
  body: string;
  mimetype: string;
  slug: string;
  created: string;
  edited: string;
  item_private: number;
  public_policy: string;
  allow_cid: string[];
  allow_gid: string[];
  deny_cid: string[];
  deny_gid: string[];
};

export async function fetchWebpages(nick: string): Promise<WebPage[]> {
  const res = await apiFetch(`/api/webpages/${nick}`);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message ?? 'Failed to fetch webpages');
  }
  const json = await res.json();
  return (json.data ?? []) as WebPage[];
}

/** Fetch a single page by its pagelink slug (used by PageView via /page/:nick/*path) */
export async function fetchWebPageByPagelink(
  nick: string,
  pagelink: string,
): Promise<WebPageDetail> {
  const res = await apiFetch(
    `/api/webpages/${nick}?pagelink=${encodeURIComponent(pagelink)}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message ?? 'Failed to fetch page');
  }
  const json = await res.json();
  return json.data as WebPageDetail;
}

/** Fetch a single page by its mid (used by inline editor / detail view) */
export async function fetchWebPageByMid(
  nick: string,
  mid: string,
): Promise<WebPageDetail> {
  const res = await apiFetch(
    `/api/webpages/${nick}?mid=${encodeURIComponent(mid)}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message ?? 'Failed to fetch page');
  }
  const json = await res.json();
  return json.data as WebPageDetail;
}

export async function deleteWebPage(iid: number): Promise<void> {
  const res = await apiFetch('/api/webpages', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete', iid }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message ?? 'Delete failed');
  }
}

/** Fetch a single page by its item id (used by the SPA editor view) */
export async function fetchWebPageByIid(
  nick: string,
  iid: number,
): Promise<WebPageDetail> {
  const res = await apiFetch(
    `/api/webpages/${nick}?iid=${iid}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message ?? 'Failed to fetch page');
  }
  const json = await res.json();
  return json.data as WebPageDetail;
}
