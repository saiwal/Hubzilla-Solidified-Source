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
  title: string;
  summary?: string;
  authorName: string;
  authorAvatar: string;
  authorUrl: string;
  authorAddress?: string;
  authorNetwork?: string;
  via?: { name: string; address: string; url: string; avatar: string };
  wallPost?: boolean;
  created: string;
  commented?: string;
  edited?: string;
  verb?: string;
  obj_type?: string;
  item_thread_top: number;
  flags: string[];
  permalink: string;
  children: Post[];
  commentCount?: number;
  likeCount: number;
  categories?: string[];
  tags?: string[];
  viewerLiked: boolean;
  viewerDisliked: boolean;
  viewerRepeated: boolean;
  viewerStarred?: boolean;
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
}
