export type EditorTab = "wysiwyg" | "source";
export type MimeType = "text/bbcode" | "text/html";

export type EditorCapabilities = {
  toolbar: "full" | "minimal" | "comment";
  preview: boolean;
  title: boolean;
  attachments: boolean;
  aclPicker: boolean;
  submitOnCtrlEnter: boolean;
};

export const CAPABILITIES: Record<string, EditorCapabilities> = {
  post: {
    toolbar: "full", preview: true, title: true,
    attachments: false, aclPicker: false, submitOnCtrlEnter: false,
  },
  comment: {
    toolbar: "comment", preview: false, title: false,
    attachments: false, aclPicker: false, submitOnCtrlEnter: true,
  },
  article: {
    toolbar: "full", preview: true, title: true,
    attachments: false, aclPicker: false, submitOnCtrlEnter: false,
  },
};

export type ComposerMeta = {
  title?: string;
  mimetype?: MimeType;
};
