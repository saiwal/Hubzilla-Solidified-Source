export interface LayoutConfig {
  leftWidth: number;       // px, default 256
  rightWidth: number;      // px, default 256
  rightPinned: boolean;    // pinned open on xl
}

export const defaultLayoutConfig: LayoutConfig = {
  leftWidth: 256,
  rightWidth: 256,
  rightPinned: true,
};
