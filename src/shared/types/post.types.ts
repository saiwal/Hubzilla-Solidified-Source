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
  item_origin?: number; // 1 = authored by this channel (viewer is the author)
  dislikeCount: number;
  repeatCount: number;
}
