// types/stream.ts
export interface RawItem {
  id: number;
  parent: number;
  uuid: string;
  mid: string;
  parent_mid: string;
  uid: number;
  title: string;
  body: string;
  verb: string;
  obj_type: string;
  item_type: number;
  item_thread_top: number;
  item_starred: number;
  item_private: number;
  item_mentionsme: number;
  item_unseen: number;
  item_verified: number;
  created: string;
  edited: string;
  expires: string;
  changed: string;
  commented: string;
  app: string;
  sig: string;
  allow_cid: string;
  allow_gid: string;
  deny_cid: string;
  deny_gid: string;
  author_xchan: string;
  owner_xchan: string;
  author: XchanInfo;
  owner: XchanInfo;
  term?: Tag[];
  attach?: Attachment[];
  // raw db fields passed through
  [key: string]: unknown;
}

export interface XchanInfo {
  xchan_hash: string;
  xchan_addr: string;
  xchan_name: string;
  xchan_url: string;
  xchan_photo_s: string;
  xchan_photo_m: string;
  xchan_photo_l: string;
  xchan_network: string;
}

export interface Tag {
  type: number;
  term: string;
  url: string;
}

export interface Attachment {
  href: string;
  length: string;
  type: string;
  title: string;
  revision: string;
}

export interface ThreadedPost {
  item: RawItem;
  children: RawItem[];
  /** all items in this thread (root + children), flat, ordered */
  flat: RawItem[];
}

export interface NetworkJsonResponse {
  items: RawItem[];
  item_count: number;
  thread_root_count: number;
  offset: number;
  limit: number;
  ordering: string;
  nouveau: boolean;
}
