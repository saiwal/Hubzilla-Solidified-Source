// src/shared/stream/types.ts

export interface StreamHandlers {
  onLike: (mid: string) => void;
  onDislike: (mid: string) => void;
  onRepeat: (mid: string) => void;
  onComment: (
    parentMid: string,
    body: string,
    authorName: string,
    authorAvatar: string,
  ) => void;
}

export type ViewMode = "feed" | "masonry" | "list" | "inbox";
