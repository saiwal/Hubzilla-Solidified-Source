import { useParams } from "@solidjs/router";

// The page module renders server-side HTML via Hubzilla's existing /page/ route.
// We proxy-display it by fetching the JSON body and rendering ourselves,
// or just open the Hubzilla page URL directly via redirect/link.
// Here we fetch the body via the API and display it.

export default function PageView() {
  const params = useParams<{ nick: string; path: string }>();

  // Fetch raw body from our JSON endpoint using the pagelink
  // We need the mid — so we first list pages and find by pagelink,
  // OR we add a ?pagelink= param to the endpoint.
  // Simplest: redirect to Hubzilla's native /page/ route for rendering,
  // since pages can have custom Comanche layouts which we can't replicate.

  const hubzillaUrl = () => `/page/${params.nick}/${params.path || ""}`;

  return (
    <div class="max-w-4xl mx-auto">
      <div class="mb-4 flex items-center gap-2 text-sm text-muted">
        <a
          href={`/webpages/${params.nick}`}
          class="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          ← Webpages
        </a>
        <span>/</span>
        <span class="font-mono">{params.path}</span>
        <a
          href={hubzillaUrl()}
          target="_blank"
          rel="noopener noreferrer"
          class="ml-auto text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 hover:bg-elevated transition-colors"
        >
          Open original ↗
        </a>
      </div>
      <iframe
        src={hubzillaUrl()}
        class="w-full min-h-screen rounded-xl border border-rim bg-white"
        title="Page content"
      />
    </div>
  );
}
