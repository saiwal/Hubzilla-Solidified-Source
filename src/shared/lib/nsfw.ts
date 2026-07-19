// shared/lib/nsfw.ts
// Client-side port of Hubzilla core's "nsfw" addon: scans a raw BBCode body
// against a per-user keyword list and, on a match, wraps the converted HTML
// in a click-to-reveal panel with deferred image loading.

export function parseNsfwWords(raw: string): string[] {
  return raw
    .split(",")
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Strip embedded data: URI blobs before matching so base64 image payloads
// can't accidentally contain a keyword substring.
function stripDataUris(body: string): string {
  return body.replace(/data:[a-z0-9/+.-]+;base64,[a-zA-Z0-9+/=]+/gi, "");
}

export function matchNsfwWord(rawBody: string, words: string[]): string | null {
  if (!rawBody || words.length === 0) return null;
  const body = stripDataUris(rawBody);

  for (const word of words) {
    if (!word) continue;
    if (word.startsWith("#")) {
      const tag = word.slice(1);
      if (!tag) continue;
      const re = new RegExp(`(^|[\\s\\[])#${escapeRegex(tag)}\\b`, "i");
      if (re.test(body)) return word;
    } else if (body.toLowerCase().includes(word.toLowerCase())) {
      return word;
    }
  }
  return null;
}

// Heroicons outline "eye-slash" / "eye" — matches the hand-inlined-SVG
// convention already used for modal close icons elsewhere in this codebase.
const EYE_SLASH_ICON = `<svg class="bb-nsfw-icon-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>`;
const EYE_ICON = `<svg class="bb-nsfw-icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`;

// Neutralize <img src=...> so images don't load until revealed, and wrap
// the body HTML in a toggle button + hidden content panel.
export function wrapNsfwHtml(html: string, label: string): string {
  const deferred = html.replace(/(<img\b[^>]*?)\ssrc=/gi, "$1 data-nsfw-src=");
  return (
    `<div class="bb-nsfw">` +
    `<button type="button" class="bb-nsfw-toggle" data-nsfw-toggle>` +
    `<span class="bb-nsfw-icon" aria-hidden="true">${EYE_SLASH_ICON}${EYE_ICON}</span>` +
    `<span class="bb-nsfw-label">Hidden content · ${label}</span>` +
    `<span class="bb-nsfw-action">View</span>` +
    `</button>` +
    `<div class="bb-nsfw-content" hidden>${deferred}</div>` +
    `</div>`
  );
}

// Shared click-delegation logic for the reveal/hide toggle produced by
// wrapNsfwHtml(). Every component that renders `post.body`/`post.title` via
// innerHTML must wire this into its click handler, or the button renders
// inert. Returns true if the click was an nsfw-toggle click (callers should
// stopPropagation()/return early in that case).
export function handleNsfwToggleClick(e: MouseEvent): boolean {
  const nsfwBtn = (e.target as HTMLElement).closest<HTMLElement>("[data-nsfw-toggle]");
  if (!nsfwBtn) return false;

  e.stopPropagation();
  const wrapper = nsfwBtn.closest<HTMLElement>(".bb-nsfw");
  const content = nsfwBtn.nextElementSibling as HTMLElement | null;
  const actionEl = nsfwBtn.querySelector<HTMLElement>(".bb-nsfw-action");
  if (content && wrapper) {
    const revealing = content.hidden === true;
    content.hidden = !revealing;
    if (revealing) {
      content
        .querySelectorAll<HTMLImageElement>("img[data-nsfw-src]")
        .forEach((img) => {
          img.src = img.dataset.nsfwSrc!;
          img.removeAttribute("data-nsfw-src");
        });
    }
    wrapper.toggleAttribute("data-revealed", revealing);
    if (actionEl) actionEl.textContent = revealing ? "Hide" : "View";
  }
  return true;
}
