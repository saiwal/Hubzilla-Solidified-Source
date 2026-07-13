export type EditorTab = "wysiwyg" | "source";
export type MimeType = "text/bbcode" | "text/html" | "text/markdown";

export type ToolbarLevel = "full" | "minimal" | "comment";
export type AttachmentsMode = "none" | "files" | "photos" | "both";
// How the LaTeX toolbar button inserts an equation:
// - "image": render to PNG, upload as a photo, insert a hosted [img] URL —
//   for federated content, where a raw data: URI/inline SVG is unreliable.
// - "live": insert $…$ / $$…$$ text, rendered client-side by hydrateLatex()
//   wherever the content is actually viewed — for in-app-only content.
export type LatexInsertMode = "image" | "live";

export type EditorCapabilities = {
  toolbar: ToolbarLevel;
  title: boolean;
  summary: boolean;
  slug: boolean;
  category: boolean;
  attachments: AttachmentsMode;
  aclPicker: boolean;
  submitOnCtrlEnter: boolean;
  latexMode: LatexInsertMode;
  poll: boolean;
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
    title: true,
    summary: true,
    slug: false,
    category: true,
    attachments: "both",
    aclPicker: true,
    submitOnCtrlEnter: true,
    latexMode: "image",
    poll: true,
  },
  // Inline comment box under a PostCard — same full toolbar as the post
  // composer, only the meta fields (title/summary/ACL/…) are stripped.
  comment: {
    toolbar: "full",
    title: false,
    summary: false,
    slug: false,
    category: false,
    attachments: "none",
    aclPicker: false,
    submitOnCtrlEnter: true,
    latexMode: "image",
    poll: false,
  },
  // Direct message — same full toolbar as post, but recipients are picked
  // via a "To:" field (RecipientField) instead of the ACL picker, so
  // aclPicker stays false here even though it does gate visibility/scope.
  dm: {
    toolbar: "full",
    title: false,
    summary: false,
    slug: false,
    category: false,
    attachments: "both",
    aclPicker: false,
    submitOnCtrlEnter: true,
    latexMode: "image",
    poll: false,
  },
  // Article / long-form post — read in-app like webpages/wiki, not federated
  // as a standalone object in the same way a stream post is, so LaTeX
  // renders live (KaTeX) rather than as an uploaded image.
  article: {
    toolbar: "full",
    title: true,
    summary: true,
    slug: true,
    category: true,
    attachments: "both",
    aclPicker: true,
    submitOnCtrlEnter: false,
    latexMode: "live",
    poll: false,
  },
  // Hubzilla webpage (static page with slug) — read in-app, not federated as
  // a standalone object, so LaTeX renders live (KaTeX) rather than as an image.
  webpage: {
    toolbar: "full",
    title: true,
    summary: true,
    slug: true,
    category: false,
    attachments: "files",
    aclPicker: true,
    submitOnCtrlEnter: false,
    latexMode: "live",
    poll: false,
  },
  // Wiki page — plain source editing, no ACL, no attachments; live LaTeX,
  // same reasoning as webpage above.
  wiki: {
    toolbar: "minimal",
    title: false,
    summary: false,
    slug: false,
    category: false,
    attachments: "none",
    aclPicker: false,
    submitOnCtrlEnter: false,
    latexMode: "live",
    poll: false,
  },
  // Personal note — always private, minimal toolbar
  note: {
    toolbar: "minimal",
    title: false,
    summary: false,
    slug: false,
    category: false,
    attachments: "photos",
    aclPicker: false,
    submitOnCtrlEnter: true,
    latexMode: "image",
    poll: false,
  },
  // Chat room message input — comment toolbar, untabbed, Ctrl+Enter sends
  chat: {
    toolbar: "comment",
    title: false,
    summary: false,
    slug: false,
    category: false,
    attachments: "none",
    aclPicker: false,
    submitOnCtrlEnter: true,
    latexMode: "image",
    poll: false,
  },
};
