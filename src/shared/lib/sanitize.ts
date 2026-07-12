// core/utils/sanitize.ts
import DOMPurify from 'dompurify';
import { emojify } from './emojify';
import { shortenUrls } from './shortenUrls';
import { getEmojiMap } from '../store/emoji-store';
import { useEmojiAsImages } from '../store/emoji-as-images';

export function sanitizeHtml(html: string): string {
  const emojified = useEmojiAsImages()() ? emojify(html, getEmojiMap()) : html;
  return DOMPurify.sanitize(shortenUrls(emojified), {
    ALLOWED_TAGS: [
      'a', 'b', 'i', 'u', 's', 'em', 'strong',
      'p', 'br', 'div', 'span', 'blockquote',
      'pre', 'code', 'img', 'details', 'summary',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'video', 'audio', 'source',
      'button',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'rel',
      'class', 'style', 'target',
      'controls', 'preload', 'poster', 'type',
      'data-plyr-provider', 'data-plyr-embed-id',
      'loading',
      'data-crypt-payload',
    ],
    ALLOW_DATA_ATTR: false,
  });
}
