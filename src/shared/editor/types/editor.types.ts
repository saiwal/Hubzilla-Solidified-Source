export type EditorTab = "wysiwyg" | "source";
export type MimeType = "text/bbcode" | "text/html";

export type ToolbarLevel = "full" | "minimal" | "comment";

export type EditorCapabilities = {
  toolbar: ToolbarLevel;
  preview: boolean;
  title: boolean;
  slug: boolean;
  category: boolean;
  attachments: boolean;
  aclPicker: boolean;
  submitOnCtrlEnter: boolean;
};

export type ComposerMeta = {
  title?: string;
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
    slug: false,
    category: false,
    attachments: false,
    aclPicker: false,
    submitOnCtrlEnter: false,
  },
  // Inline comment box under a PostCard
  comment: {
    toolbar: "comment",
    preview: false,
    title: false,
    slug: false,
    category: false,
    attachments: false,
    aclPicker: false,
    submitOnCtrlEnter: true,
  },
  // Article / long-form post
  article: {
    toolbar: "full",
    preview: true,
    title: true,
    slug: true,
    category: true,
    attachments: false,
    aclPicker: false,
    submitOnCtrlEnter: false,
  },
  // Hubzilla webpage (static page with slug)
  webpage: {
    toolbar: "full",
    preview: true,
    title: true,
    slug: true,
    category: false,
    attachments: false,
    aclPicker: false,
    submitOnCtrlEnter: false,
  },
};
