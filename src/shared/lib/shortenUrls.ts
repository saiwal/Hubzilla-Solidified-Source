// Visually shortens auto-linked URLs in HTML.
// Only touches <a> elements whose text content is the URL itself
// (i.e. the link was auto-generated, not user-written text like "click here").
// The href is preserved; only the display text is truncated.
//
// Example:
//   <a href="https://example.com/very/long/path">https://example.com/very/long/path</a>
//   → <a href="https://example.com/very/long/path">example.com/very/long/pa…</a>

export function shortenUrls(html: string, maxLen = 50): string {
  return html.replace(
    /(<a\b[^>]*>)(https?:\/\/[^<]+)(<\/a>)/gi,
    (match, open, urlText, close) => {
      const stripped = urlText.trim().replace(/^https?:\/\//, '');
      if (stripped.length <= maxLen) return match;
      return open + stripped.slice(0, maxLen) + '…' + close;
    },
  );
}
