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
  onLoadComments: (mid: string, uuid: string) => Promise<void>;
  onStar?: (mid: string) => void;
  onDelete?: (mid: string) => Promise<void>;
  onEdit?: (mid: string, body: string, title?: string) => Promise<void>;
  onRefresh?: (mid: string, uuid: string) => Promise<void>;
}

export type ViewMode = "feed" | "masonry" | "list";
