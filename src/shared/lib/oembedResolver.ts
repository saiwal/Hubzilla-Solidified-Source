// Converts YouTube and Vimeo URLs into Plyr-compatible embed divs.
// Used as the oembedResolver callback in bbcodeToHtml.
export function oembedResolver(url: string): string | null {
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return `<div class="plyr-embed-wrap" data-plyr-provider="youtube" data-plyr-embed-id="${ytMatch[1]}"></div>`;
  }

  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    return `<div class="plyr-embed-wrap" data-plyr-provider="vimeo" data-plyr-embed-id="${vimeoMatch[1]}"></div>`;
  }

  return null;
}
