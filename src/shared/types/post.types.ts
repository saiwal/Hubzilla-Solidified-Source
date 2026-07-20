export interface PollOption {
  name: string;
  votes: number;
}

export interface PollData {
  multiple: boolean;
  end_time: string | null;
  closed: string | null;
  options: PollOption[];
  viewer_votes: string[];
}

export interface StreamAttachment {
  href: string;
  length: string;
  type: string;
  title: string;
  revision: string;
}

export interface EventData {
  summary: string;
  start: string;
  finish: string;
  id: string;
}

export interface Post {
  id: string;
  iid?: number; // local integer item id — used by /like/{iid}
  uuid: string;
  profileUid?: number; // local channel uid — used by /item comment POST
  mid: string;
  parent_mid: string;
  thr_parent: string;
  top_mid: string;
  parent: string;
  body: string;
  rawBody?: string; // unconverted bbcode source, needed to seed the edit form
  bodyNsfw?: boolean; // body matched an nsfw keyword — body is wrapped in a reveal panel
  title: string;
  titleNsfw?: boolean; // title matched an nsfw keyword — title is wrapped in a reveal panel
  summary?: string;
  authorName: string;
  authorAvatar: string;
  authorUrl: string;
  authorHash?: string;
  authorAddress?: string;
  authorNetwork?: string;
  via?: { name: string; address: string; url: string; hash?: string; avatar: string };
  created: string;
  commented?: string;
  edited?: string;
  verb?: string;
  obj_type?: string;
  item_thread_top: number;
  flags: string[];
  canComment?: boolean; // viewer may reply (comment policy / closed / owner perms)
  permalink: string;
  location?: string; // free-text place name set on the post
  coord?: string; // "lat lon" coordinates, when geotagged
  expires?: string; // UTC datetime the post self-destructs; unset = never
  children: Post[];
  commentCount?: number;
  likeCount: number;
  categories?: string[];
  tags?: string[];
  viewerLiked: boolean;
  viewerDisliked: boolean;
  viewerRepeated: boolean;
  viewerStarred?: boolean;
  pinned?: boolean; // channel-wide pin state (not viewer-relative), from flags[]
  viewerFollowing?: boolean;
  viewerAttending?: boolean;
  viewerDeclining?: boolean;
  viewerMaybe?: boolean;
  attendCount?: number;
  declineCount?: number;
  maybeCount?: number;
  eventData?: EventData;
  attachments?: StreamAttachment[];
  poll?: PollData;
  item_origin?: number; // 1 = authored by this channel (viewer is the author)
  dislikeCount: number;
  repeatCount: number;
  blocked?: boolean; // author or owner is on the viewer's personal block list
  slug?: string; // human-readable identifier alias (articles/webpages), stored via iconfig
  viewUrl?: string; // absolute app URL (slug-preferred), distinct from the immutable `permalink`
  publicPolicy?: string; // ACL public_policy column (e.g. "contacts"), needed to reconstruct the editor's ACL mode
  allowCid?: string[]; // ACL allow_cid, as bare xchan hashes
  allowGid?: string[]; // ACL allow_gid, as bare privacy-group ids
  denyCid?: string[]; // ACL deny_cid, as bare xchan hashes
  denyGid?: string[]; // ACL deny_gid, as bare privacy-group ids
}
