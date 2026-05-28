import type { FileMeta } from "@/modules/files/api";
import type { Photo } from "@/modules/photos/api/api";

export type AttachmentSource = "upload" | "cloud-file" | "photo";
export type AttachmentStatus = "uploading" | "ready" | "error";

export interface Attachment {
  id: string;
  source: AttachmentSource;
  status: AttachmentStatus;
  progress: number;
  filename: string;
  isImage: boolean;
  thumbUrl?: string;
  insertUrl?: string;
  hash?: string;
  resourceId?: string;
  altText?: string;
  file?: File;
  error?: string;
}

export interface AttachmentStore {
  attachments: () => Attachment[];
  uploading: () => boolean;
  addUploads: (files: FileList | File[]) => void;
  addCloudFiles: (files: FileMeta[]) => void;
  addPhotos: (photos: Photo[]) => void;
  remove: (id: string) => void;
  setAltText: (id: string, text: string) => void;
  insertBBCode: (id: string) => string;
  clear: () => void;
}
