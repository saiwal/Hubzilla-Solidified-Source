import { createEffect, Show, For, createSignal } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import { useAuth } from '@/shared/store/auth-store';
import { pages, loading, loadWebpages, removePage } from '../store';
import type { WebPage } from '../api';
import { useI18n } from '@/i18n';

export default function WebpagesView() {
  const { t } = useI18n();
  const params = useParams<{ nick: string }>();
  const auth   = useAuth();
  const [confirmIid, setConfirmIid] = createSignal<number | null>(null);

  const nick = () => params.nick || auth()?.nick || '';

  createEffect(() => {
    if ((auth as any).loading || !nick()) return;
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
        <h1 class="text-2xl font-bold text-txt">{t("webpages.title")}</h1>
        <A
          href={`/webpages/${nick()}/new`}
          class="px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {t("webpages.new_page")}
        </A>
      </div>

      <Show when={!loading()} fallback={<WebpagesPlaceholder />}>
        <Show
          when={pages().length > 0}
          fallback={<EmptyState nick={nick()} />}
        >
          <div class="bg-surface rounded-xl border border-rim overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-rim text-xs uppercase tracking-wide text-muted">
                  <th class="px-4 py-3 text-left font-medium">{t("webpages.col_title")}</th>
                  <th class="px-4 py-3 text-left font-medium hidden md:table-cell">{t("webpages.col_page_link")}</th>
                  <th class="px-4 py-3 text-left font-medium hidden lg:table-cell">{t("webpages.col_last_edited")}</th>
                  <th class="px-4 py-3 text-left font-medium">{t("webpages.col_visibility")}</th>
                  <th class="px-4 py-3 text-right font-medium">{t("webpages.col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                <For each={pages()}>
                  {(page) => (
                    <PageRow
                      page={page}
                      nick={nick()}
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
  nick: string;
  confirmingDelete: boolean;
  onDelete: () => void;
  onCancelDelete: () => void;
}) {
  const { t } = useI18n();
  const fmtDate = (s: string) =>
    new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });

  return (
    <tr class="border-b border-rim hover:bg-elevated transition-colors group">
      <td class="px-4 py-3">
        <a
          href={props.page.view_url}
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-txt hover:text-accent transition-colors"
        >
          {props.page.title || t("webpages.untitled")}
        </a>
      </td>
      <td class="px-4 py-3 hidden md:table-cell">
        <span class="font-mono text-xs text-muted bg-overlay px-2 py-1 rounded">
          /{props.page.pagelink}
        </span>
      </td>
      <td class="px-4 py-3 hidden lg:table-cell text-muted">
        {fmtDate(props.page.edited || props.page.created)}
      </td>
      <td class="px-4 py-3">
        <span
          class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            props.page.is_private
              ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {props.page.is_private ? t("webpages.private_label") : t("webpages.public_label")}
        </span>
      </td>
      <td class="px-4 py-3 text-right">
        <Show
          when={!props.confirmingDelete}
          fallback={
            <span class="inline-flex gap-2 items-center">
              <span class="text-xs text-muted">{t("webpages.delete_confirm")}</span>
              <button
                onClick={props.onDelete}
                class="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                {t("webpages.yes")}
              </button>
              <button
                onClick={props.onCancelDelete}
                class="text-xs px-2 py-1 rounded border border-rim text-muted hover:bg-elevated transition-colors"
              >
                {t("webpages.no")}
              </button>
            </span>
          }
        >
          <span class="inline-flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={props.page.view_url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs px-2 py-1 rounded border border-rim text-muted hover:bg-elevated transition-colors"
            >
              {t("webpages.view")}
            </a>
            <A
              href={`/webpages/${props.nick}/edit/${props.page.iid}`}
              class="text-xs px-2 py-1 rounded border border-rim text-muted hover:bg-elevated transition-colors"
            >
              {t("webpages.edit")}
            </A>
            <button
              onClick={props.onDelete}
              class="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
            >
              {t("webpages.delete")}
            </button>
          </span>
        </Show>
      </td>
    </tr>
  );
}

function EmptyState(props: { nick: string }) {
  const { t } = useI18n();
  return (
    <div class="text-center py-16 space-y-4">
      <div class="text-5xl">📄</div>
      <p class="text-muted">{t("webpages.no_webpages")}</p>
      <a
        href={`/webpages/${props.nick}/new`}
        class="inline-block px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {t("webpages.create_first")}
      </a>
    </div>
  );
}

function WebpagesPlaceholder() {
  return (
    <div class="bg-surface rounded-xl border border-rim overflow-hidden">
      <div class="divide-y divide-rim">
        <For each={Array(5).fill(0)}>
          {() => (
            <div class="px-4 py-3 flex items-center gap-4 animate-pulse">
              <div class="h-4 bg-elevated rounded w-48" />
              <div class="h-4 bg-elevated rounded w-32 hidden md:block" />
              <div class="h-4 bg-elevated rounded w-24 ml-auto" />
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
