export type PubSite = {
  url: string;
  urltext: string;
  host: string;
  sellpage: string | null;
  access: string;
  register: string;
  project: string;
  version: string;
  location: string;
  rating_enabled: boolean;
  can_rate: boolean;
};

export async function fetchPubsites(): Promise<PubSite[]> {
  const res = await fetch('/api/pubsites');
  if (!res.ok) throw new Error('Failed to fetch pubsites');
  const json = await res.json();
  const d = json.data ?? json; // unwrap data envelope
  return d.sites ?? [];
}
