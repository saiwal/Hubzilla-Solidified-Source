export type SiteInfo = {
  site_name: string;
  site_about: string;        // raw BBCode
  admin_about: string;       // raw BBCode
  version: string | null;
  project_link: string;
  project_src: string;
  addons: string[];
  themes: string[];
  blocked_sites: string[];
  federated: string[];
  registration: 0 | 1 | 2;  // 0=closed, 1=open, 2=approve
};

export async function fetchSiteInfo(): Promise<SiteInfo> {
  const res = await fetch('/spa/siteinfo');
  if (!res.ok) throw new Error(`siteinfo: ${res.status}`);
  const json = await res.json();
  const d = json.data ?? json; // unwrap data envelope
  return {
    ...d,
    addons:        Array.isArray(d.addons)        ? d.addons        : [],
    themes:        Array.isArray(d.themes)         ? d.themes        : [],
    blocked_sites: Array.isArray(d.blocked_sites)  ? d.blocked_sites : [],
    federated:     Array.isArray(d.federated)      ? d.federated     : [],
  };
}
