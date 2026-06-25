export type EditorTab = "wysiwyg" | "source" | "preview";
export type MimeType = "text/bbcode" | "text/html" | "text/markdown";

export type ToolbarLevel = "full" | "minimal" | "comment";
export type AttachmentsMode = "none" | "files" | "photos" | "both";

export type EditorCapabilities = {
  toolbar: ToolbarLevel;
  preview: boolean;
  title: boolean;
  summary: boolean;
  slug: boolean;
  category: boolean;
  attachments: AttachmentsMode;
  aclPicker: boolean;
  submitOnCtrlEnter: boolean;
};

export type ComposerMeta = {
  title?: string;
  summary?: string;
  slug?: string;
  category?: string;
  mimetype?: MimeType;
};

export const CAPABILITIES: Record<string, EditorCapabilities> = {
  // Wall post (HQ / network composer)
  post: {
    toolbar: "full",
    preview: true,
    title: true,
    summary: true,
    slug: false,
    category: true,
    attachments: "both",
    aclPicker: true,
    submitOnCtrlEnter: true,
  },
  // Inline comment box under a PostCard
  comment: {
    toolbar: "comment",
    preview: true,
    title: false,
    summary: false,
    slug: false,
    category: false,
    attachments: "none",
    aclPicker: false,
    submitOnCtrlEnter: true,
  },
  // Article / long-form post
  article: {
    toolbar: "full",
    preview: true,
    title: true,
    summary: true,
    slug: true,
    category: true,
    attachments: "both",
    aclPicker: true,
    submitOnCtrlEnter: false,
  },
  // Hubzilla webpage (static page with slug)
  webpage: {
    toolbar: "full",
    preview: true,
    title: true,
    summary: false,
    slug: true,
    category: false,
    attachments: "files",
    aclPicker: false,
    submitOnCtrlEnter: false,
  },
  // Wiki page — plain source editing, no ACL, no attachments
  wiki: {
    toolbar: "minimal",
    preview: true,
    title: false,
    summary: false,
    slug: false,
    category: false,
    attachments: "none",
    aclPicker: false,
    submitOnCtrlEnter: false,
  },
  // Personal note — always private, minimal toolbar
  note: {
    toolbar: "minimal",
    preview: true,
    title: false,
    summary: false,
    slug: false,
    category: false,
    attachments: "photos",
    aclPicker: false,
    submitOnCtrlEnter: true,
  },
};
