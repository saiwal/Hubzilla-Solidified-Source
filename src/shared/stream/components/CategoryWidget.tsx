// src/shared/stream/components/CategoryWidget.tsx
//
// API: GET /api/stream-widgets/categories?channel_nick=<nick>&type=<articles|posts>
// Response: { data: { categories: { name: string; slug: string; count: number }[] } }

import { type Component, createEffect, on, createResource, For, Show } from "solid-js";
import { useI18n } from "@/i18n";
import { toast } from "@/shared/store/toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategoryItem {
  name: string;
  slug: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

export async function fetchCategories(params: {
  channelNick?: string;
  type?: "articles" | "posts";
}): Promise<CategoryItem[]> {
  const url = new URL("/api/stream-widgets/categories", window.location.origin);
  if (params.channelNick) url.searchParams.set("channel_nick", params.channelNick);
  if (params.type) url.searchParams.set("type", params.type);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const data = json.data ?? json;
  return data.categories ?? [];
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CategorySkeleton() {
  const widths = [55, 75, 40, 65, 50];
  return (
    <ul class="divide-y divide-rim animate-pulse">
      <For each={widths}>
        {(w) => (
          <li class="px-4 py-2.5 flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-elevated shrink-0" />
            <div class="h-2.5 bg-elevated rounded" style={{ width: `${w}%` }} />
            <div class="ml-auto h-2.5 bg-elevated rounded w-5 shrink-0" />
            <div class="w-12 h-1 rounded-full bg-elevated shrink-0" />
          </li>
        )}
      </For>
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CategoryWidgetProps {
  channelNick?: string;
  type?: "articles" | "posts";
  /** Called when the user clicks a category row */
  onCategoryClick?: (slug: string) => void;
  /** Slug of the currently active/filtered category */
  activeSlug?: string;
  /** Pre-fetched data — skips the internal fetch when provided */
  data?: CategoryItem[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CategoryWidget: Component<CategoryWidgetProps> = (props) => {
  const { t } = useI18n();

  const [remote] = createResource(
    () =>
      props.data
        ? null
        : { channelNick: props.channelNick, type: props.type },
    (p) => (p ? fetchCategories(p) : Promise.resolve([])),
  );

  createEffect(on(() => remote.error, (err) => { if (err) toast.error(err.message ?? t("widgets.load_error")); }));

  const categories = (): CategoryItem[] => props.data ?? remote() ?? [];
  const total = () => categories().reduce((s, c) => s + c.count, 0);

  return (
    <div class="bg-surface border border-rim rounded-xl overflow-hidden">
      {/* Header */}
      <div class="px-4 py-3 border-b border-rim">
        <h3 class="text-sm font-semibold text-txt">{t("widgets.categories")}</h3>
      </div>

      {/* Loading */}
      <Show when={!props.data && remote.loading}>
        <CategorySkeleton />
      </Show>

      {/* Content */}
      <Show when={!remote.loading}>
        <Show
          when={categories().length > 0}
          fallback={
            <p class="px-4 py-3 text-xs text-muted">
              {t("widgets.no_categories")}
            </p>
          }
        >
          <ul class="divide-y divide-rim">
            <For each={categories()}>
              {(cat) => {
                const pct = () =>
                  total() > 0 ? Math.round((cat.count / total()) * 100) : 0;
                const isActive = () => props.activeSlug === cat.slug;

                return (
                  <li>
                    <button
                      onClick={() => props.onCategoryClick?.(cat.slug)}
                      class="w-full px-4 py-2.5 flex items-center gap-2 text-left
                             hover:bg-elevated transition-colors group"
                      classList={{ "bg-accent-muted": isActive() }}
                    >
                      {/* Colour dot */}
                      <span
                        class="w-2 h-2 rounded-full shrink-0 bg-accent transition-opacity"
                        classList={{
                          "opacity-100": isActive(),
                          "opacity-50": !isActive(),
                        }}
                      />

                      {/* Label */}
                      <span
                        class="flex-1 text-sm truncate transition-colors"
                        classList={{
                          "text-accent font-medium": isActive(),
                          "text-txt group-hover:text-accent": !isActive(),
                        }}
                      >
                        {cat.name}
                      </span>

                      {/* Count */}
                      <span class="text-xs text-muted shrink-0">{cat.count}</span>

                      {/* Mini bar */}
                      <div class="w-12 h-1 rounded-full bg-elevated shrink-0 overflow-hidden">
                        <div
                          class="h-full bg-accent rounded-full transition-all duration-300"
                          style={{ width: `${pct()}%` }}
                        />
                      </div>
                    </button>
                  </li>
                );
              }}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
};

export default CategoryWidget;
