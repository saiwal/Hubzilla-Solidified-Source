// src/shared/lib/post-api.ts
export async function postToWall(opts: {
  body: string;
  mimetype: string;
  profile_uid: number;
  title?: string;
}) {
  const csrf = document.querySelector<HTMLMetaElement>('meta[name="api-token"]')?.content ?? "";
  const fd = new FormData();
  fd.append("body", opts.body);
  fd.append("mimetype", opts.mimetype);
  fd.append("profile_uid", String(opts.profile_uid));
  fd.append("type", "wall");
  if (opts.title) fd.append("title", opts.title);
  const res = await fetch("/item", { method: "POST", headers: { "X-CSRF-Token": csrf }, body: fd });
  if (!res.ok) throw new Error("Post failed");
}
