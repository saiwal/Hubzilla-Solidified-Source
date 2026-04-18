import { createEffect, Show, For, createSignal } from 'solid-js';
import { useParams } from '@solidjs/router';
import { useAuth } from '@/shared/store/auth-store';
import { pages, loading, error, loadWebpages, removePage } from '../store/store';
import type { WebPage } from '../api/api';
// import { useI18n } from '@/i18n';

export default function WebpagesView() {
  const params = useParams<{ nick: string }>();
  const auth = useAuth();
  // const { t } = useI18n();
  const [confirmIid, setConfirmIid] = createSignal<number | null>(null);

  const nick = () => params.nick || auth()?.nick || '';

  createEffect(() => {
    if (auth.loading || !nick()) return;
    loadWebpages(nick());
  });

  const handleDelete = async (iid: number) => {
    if (confirmIid() !== iid) { setConfirmIid(iid); return; }
    setConfirmIid(null);
    await removePage(iid);
  };

  return (
    <div class="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Webpages</h1>
				<a        
          href={`/webpages/${nick()}/new`}
          class="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Page
        </a>
      </div>

      <Show when={error()}>
        <div class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error()}
        </div>
      </Show>

      <Show
        when={!loading()}
        fallback={<WebpagesPlaceholder />}
      >
        <Show
          when={pages().length > 0}
          fallback={<EmptyState nick={nick()} />}
        >
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th class="px-4 py-3 text-left font-medium">Title</th>
                  <th class="px-4 py-3 text-left font-medium hidden md:table-cell">Page Link</th>
                  <th class="px-4 py-3 text-left font-medium hidden lg:table-cell">Last edited</th>
                  <th class="px-4 py-3 text-left font-medium">Visibility</th>
                  <th class="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <For each={pages()}>
                  {(page) => (
                    <PageRow
                      page={page}
                      confirmingDelete={confirmIid() === page.iid}
                      onDelete={() => handleDelete(page.iid)}
                      onCancelDelete={() => setConfirmIid(null)}
                    />
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </Show>
    </div>
  );
}

function PageRow(props: {
  page: WebPage;
  confirmingDelete: boolean;
  onDelete: () => void;
  onCancelDelete: () => void;
}) {
  const fmtDate = (s: string) =>
    new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });

  return (
    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group">
      <td class="px-4 py-3">
       <a 
          href={props.page.view_url}
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {props.page.title || '(untitled)'}
        </a>
      </td>
      <td class="px-4 py-3 hidden md:table-cell">
        <span class="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          /{props.page.pagelink}
        </span>
      </td>
      <td class="px-4 py-3 hidden lg:table-cell text-gray-500 dark:text-gray-400">
        {fmtDate(props.page.edited || props.page.created)}
      </td>
      <td class="px-4 py-3">
        <span
          class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            props.page.is_private
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          }`}
        >
          {props.page.is_private ? '🔒 Private' : '🌐 Public'}
        </span>
      </td>
      <td class="px-4 py-3 text-right">
        <Show
          when={!props.confirmingDelete}
          fallback={
            <span class="inline-flex gap-2 items-center">
              <span class="text-xs text-gray-500 dark:text-gray-400">Delete?</span>
              <button
                onClick={props.onDelete}
                class="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={props.onCancelDelete}
                class="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 transition-colors"
              >
                No
              </button>
            </span>
          }
        >
          <span class="inline-flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <a    
              href={props.page.view_url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              View
            </a>
         <a   
              href={props.page.edit_url}
              class="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Edit
            </a>
            <button
              onClick={props.onDelete}
              class="text-xs px-2 py-1 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
          </span>
        </Show>
      </td>
    </tr>
  );
}

function EmptyState(props: { nick: string }) {
  return (
    <div class="text-center py-16 space-y-4">
      <div class="text-5xl">📄</div>
      <p class="text-gray-500 dark:text-gray-400">No webpages yet.</p>
     <a 
        href={`/webpages/${props.nick}/new`}
        class="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Create your first page
      </a>
    </div>
  );
}

function WebpagesPlaceholder() {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="divide-y divide-gray-100 dark:divide-gray-700">
        <For each={Array(5).fill(0)}>
          {() => (
            <div class="px-4 py-3 flex items-center gap-4 animate-pulse">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 hidden md:block" />
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 ml-auto" />
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
