// core/utils/sanitize.ts
import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a', 'b', 'i', 'u', 's', 'em', 'strong',
      'p', 'br', 'div', 'span', 'blockquote',
      'pre', 'code', 'img', 'details', 'summary',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'video', 'audio', 'source',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'rel',
      'class', 'style', 'target',
      'controls', 'preload', 'poster', 'type',
      'data-plyr-provider', 'data-plyr-embed-id',
    ],
    ALLOW_DATA_ATTR: false,
  });
}
