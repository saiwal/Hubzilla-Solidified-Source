import { createEffect, Show, For } from 'solid-js';
import { useParams, A, useNavigate } from '@solidjs/router';
import { useAuth } from '@/shared/store/auth-store';
import { pages, loading, loadWebpages, removePage } from '../store';
import type { WebPage } from '../api';
import { useI18n } from '@/i18n';
import {
  MdOutlineDescription,
  MdFillLock,
  MdFillLock_open,
  MdFillDelete,
  MdOutlineEdit_note,
} from 'solid-icons/md';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(s: string): string {
  if (!s) return '—';
  try {
    return new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return s; }
}

// ── Page row ──────────────────────────────────────────────────────────────────

function PageRow(props: {
  page: WebPage;
  nick: string;
  onDelete: (iid: number) => void;
}) {
  const { t } = useI18n();

  return (
    <div class="flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-colors hover:bg-elevated">
      <MdOutlineDescription class="w-5 h-5 shrink-0 text-muted select-none" />

      {/* Title + slug */}
      <div class="flex-1 min-w-0">
        <a
          href={props.page.view_url}
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm font-medium text-txt truncate block hover:text-accent transition-colors"
        >
          {props.page.title || t('webpages.untitled')}
        </a>
        <span class="text-[11px] text-muted font-mono truncate block">
          /{props.page.pagelink}
        </span>
      </div>

      {/* Access badge */}
      <span class={`hidden sm:flex items-center gap-1 text-xs shrink-0 ${
        props.page.is_private ? 'text-accent' : 'text-muted'
      }`}>
        <Show when={props.page.is_private} fallback={<MdFillLock_open size={11} />}>
          <MdFillLock size={11} />
        </Show>
        {props.page.is_private ? t('webpages.private_label') : t('webpages.public_label')}
      </span>

      {/* Date */}
      <span class="hidden md:block text-xs text-muted w-28 text-right shrink-0">
        {formatDate(props.page.edited || props.page.created)}
      </span>

      {/* Actions — fade in on hover */}
      <div class="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
        {/* View */}
        <a
          href={props.page.view_url}
          target="_blank"
          rel="noopener noreferrer"
          class="p-1.5 rounded text-muted hover:text-txt hover:bg-overlay transition-colors"
          title={t('webpages.view') as string}
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        {/* Edit */}
        <A
          href={`/webpages/${props.nick}/edit/${props.page.iid}`}
          class="p-1.5 rounded text-muted hover:text-txt hover:bg-overlay transition-colors"
          title={t('webpages.edit') as string}
        >
          <MdOutlineEdit_note size={14} />
        </A>

        {/* Delete */}
        <button
          onClick={() => props.onDelete(props.page.iid)}
          class="p-1.5 rounded text-muted hover:text-red-500 hover:bg-overlay transition-colors"
          title={t('webpages.delete') as string}
        >
          <MdFillDelete size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div class="space-y-1 animate-pulse">
      <For each={Array(5).fill(0)}>
        {() => (
          <div class="flex items-center gap-3 px-3 py-2.5">
            <div class="w-5 h-5 rounded bg-overlay shrink-0" />
            <div class="flex-1 space-y-1.5">
              <div class="h-3.5 bg-overlay rounded w-48" />
              <div class="h-2.5 bg-overlay rounded w-32" />
            </div>
            <div class="hidden sm:block w-16 h-3 bg-overlay rounded" />
            <div class="hidden md:block w-24 h-3 bg-overlay rounded" />
            <div class="w-20 h-3 bg-overlay rounded" />
          </div>
        )}
      </For>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function WebpagesView() {
  const { t }    = useI18n();
  const params   = useParams<{ nick: string }>();
  const auth     = useAuth();
  const navigate = useNavigate();

  const nick = () => params.nick || auth()?.nick || '';

  createEffect(() => {
    if ((auth as any).loading || !nick()) return;
    if (auth()?.nick !== nick()) {
      navigate(`/page/${nick()}/home`, { replace: true });
      return;
    }
    loadWebpages(nick());
  });

  async function handleDelete(iid: number) {
    const page = pages().find((p) => p.iid === iid);
    const label = page?.title || t('webpages.untitled');
    if (!confirm(`Delete "${label}"?`)) return;
    await removePage(iid);
  }

  return (
    <div class="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4">

      {/* Header */}
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-lg font-semibold text-txt">{t('webpages.title')}</h1>
        <div class="flex items-center gap-2">
          <A
            href={`/webpages/${nick()}/menus`}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rim
                   text-txt text-sm hover:bg-elevated transition-colors"
          >
            {t('webpages.manage_menus')}
          </A>
          <A
            href={`/webpages/${nick()}/layouts`}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rim
                   text-txt text-sm hover:bg-elevated transition-colors"
          >
            {t('webpages.manage_layouts')}
          </A>
          <A
            href={`/webpages/${nick()}/new`}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent
                   text-accent-fg text-sm hover:opacity-90 transition-opacity"
          >
            + {t('webpages.new_page')}
          </A>
        </div>
      </div>

      <div class="border-t border-rim" />

      {/* Column labels */}
      <div class="flex items-center gap-3 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted select-none">
        <span class="w-5 shrink-0" />
        <span class="flex-1">{t('webpages.col_title')}</span>
        <span class="hidden sm:block w-20 shrink-0 text-right">{t('webpages.col_visibility')}</span>
        <span class="hidden md:block w-28 shrink-0 text-right">{t('webpages.col_last_edited')}</span>
        <span class="w-20 shrink-0" />
      </div>

      {/* List */}
      <Show when={!loading()} fallback={<Skeleton />}>
        <Show
          when={pages().length > 0}
          fallback={<EmptyState nick={nick()} />}
        >
          <div class="space-y-0.5">
            <For each={pages()}>
              {(page) => (
                <PageRow
                  page={page}
                  nick={nick()}
                  onDelete={handleDelete}
                />
              )}
            </For>
          </div>
        </Show>
      </Show>

    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState(props: { nick: string }) {
  const { t } = useI18n();
  return (
    <div class="py-16 flex flex-col items-center gap-4 text-center">
      <MdOutlineDescription class="w-10 h-10 text-muted" />
      <p class="text-sm text-muted">{t('webpages.no_webpages')}</p>
      <A
        href={`/webpages/${props.nick}/new`}
        class="px-4 py-1.5 rounded-lg bg-accent text-accent-fg text-sm hover:opacity-90 transition-opacity"
      >
        {t('webpages.create_first')}
      </A>
    </div>
  );
}
