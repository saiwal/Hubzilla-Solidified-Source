// mappers/activity.mapper.ts
import { sanitizeHtml } from "@/shared/lib/sanitize";
import { bbcodeToHtml } from "@/shared/lib/bbcode";
import type { Post } from "@/shared/types/post.types";

// Verbs that represent actual displayable content
// const DISPLAYABLE_VERBS = new Set(['Create', 'Like', 'Dislike', 'Announce']);

export function shouldDisplayActivity(activity: any): boolean {
  // Filter out internal "Add" bookkeeping entries — they have no body and just mirror another item
  if (activity.verb === "Add") return false;
  // Filter out items flagged as notshown
  if (activity.flags?.includes("notshown")) return false;
  return true;
}

export function mapActivityToPost(activity: any): Post {
  let body = "";

  try {
    const raw = bbcodeToHtml(activity.body ?? "");
    body = sanitizeHtml(typeof raw === "string" ? raw : "");
  } catch (err) {
    console.error("Body parse failed", activity.body, err);
    body = "";
  }
  // const body = sanitizeHtml(bbcodeToHtml(activity.body ?? ""));
  return {
    id: activity.iid,
    iid: activity.iid ? Number(activity.iid) : undefined,
    uuid: activity.uuid,
    profileUid: activity.profile_uid ? Number(activity.profile_uid) : undefined,
    mid: activity.mid, // was: activity.message_id
    parent_mid: activity.parent_mid, // was: activity.message_parent
    thr_parent: activity.thr_parent, // was: activity.message_parent
    top_mid: activity.message_top, // same
    parent: activity.uuid,
    body,
    title: activity.title ?? "",
		summary: activity.summary ?? "",
    authorName: activity.author?.name ?? "",
    authorAvatar: activity.author?.photo?.src ?? "",
    authorUrl: activity.author?.url ?? "",
    created: activity.created,
    commented: activity.commented,
    edited: activity.edited,
    verb: activity.verb,
    obj_type: activity.obj_type, // was: activity.object_type
    item_thread_top: activity.item_thread_top ?? 0,
    flags: activity.flags ?? [],
    permalink: activity.permalink ?? "",
    likeCount: activity.like_count ?? 0,
    viewerLiked: activity.viewer_liked ?? false,
    viewerDisliked: activity.viewer_disliked ?? false,
    viewerRepeated: activity.viewer_repeated ?? false,
    dislikeCount: activity.dislike_count ?? 0,
    repeatCount: activity.announce_count ?? 0,
    children: [],
  };
}
