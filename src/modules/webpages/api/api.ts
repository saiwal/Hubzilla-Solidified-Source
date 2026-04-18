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
  mid: string;
  title: string;
  body: string;
  mimetype: string;
  created: string;
  edited: string;
};

export async function fetchWebpages(nick: string): Promise<WebPage[]> {
  const res = await fetch(`/webpages/${nick}?format=json`);
  if (!res.ok) throw new Error('Failed to fetch webpages');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.pages ?? [];
}

export async function fetchWebPage(nick: string, mid: string): Promise<WebPageDetail> {
  const res = await fetch(`/webpages/${nick}?format=json&mid=${encodeURIComponent(mid)}`);
  if (!res.ok) throw new Error('Failed to fetch page');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function deleteWebPage(iid: number): Promise<void> {
  const body = new URLSearchParams({ action: 'delete', iid: String(iid) });
  const res = await fetch(`/webpages?format=json`, { method: 'POST', body });
  if (!res.ok) throw new Error('Delete failed');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
}
