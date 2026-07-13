/** Turns free text into a URL-safe slug — shared by Article/Webpage's slug fields. */
export function slugify(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
