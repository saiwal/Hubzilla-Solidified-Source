import { type JSX, Show, createMemo } from "solid-js";
import { useLocation, useNavigate, A } from "@solidjs/router";
import { useViewerRole } from "@/shared/store/site-config";
import { useInstalledApps } from "@/shared/store/nav-store";
import { useI18n } from "@/i18n";

export type SubPageContext = "owner" | "local" | "remote" | "anonymous" | "all";

export interface SubPageItem {
  path: string;
  label: string | (() => string);
  icon?: JSX.Element;
  dividerAfter?: boolean;
  /** Who can see this nav item. Omit or use "all" for everyone. */
  context?: SubPageContext | SubPageContext[];
  /** Hubzilla app name that must be installed for this item to appear. */
  requiresApp?: string;
}

interface Props {
  base: string;
  items: SubPageItem[];
  activeKey: string;
  children: JSX.Element;
}

function isVisible(item: SubPageItem, role: string, installed: Set<string>): boolean {
  if (item.requiresApp && !installed.has(item.requiresApp)) return false;
  if (!item.context || item.context === "all") return true;
  // "admin" is a superset of "owner" for visibility purposes
  const effectiveRole = role === "admin" ? "owner" : role;
  if (Array.isArray(item.context)) return item.context.includes(effectiveRole as SubPageContext);
  return item.context === effectiveRole;
}

export default function SubPageLayout(props: Props) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const role = useViewerRole();
  const installedApps = useInstalledApps();

  const visibleItems = createMemo(() =>
    props.items.filter((item) => isVisible(item, role(), installedApps())),
  );

  const atBase = () =>
    location.pathname === props.base ||
    location.pathname === props.base + "/";

  const activeItem = () =>
    visibleItems().find((item) => item.path === props.activeKey);

  return (
    <div class="flex h-full min-h-0">

      {/* ── Left nav ─────────────────────────────────────── */}
      <aside
        class={[
          "shrink-0 flex flex-col border-rim",
          "w-full md:w-56 lg:w-60",
          "border-b md:border-b-0 md:border-r",
          atBase() ? "flex" : "hidden md:flex",
        ].join(" ")}
      >
        <SubPageNav
          base={props.base}
          items={visibleItems()}
          activeKey={props.activeKey}
        />
      </aside>

      {/* ── Right detail ─────────────────────────────────── */}
      <main
        class={[
          "flex-1 min-w-0 flex flex-col",
          atBase() ? "hidden md:flex" : "flex",
        ].join(" ")}
      >
        {/* Mobile back bar */}
        <Show when={!atBase()}>
          <div class="flex items-center gap-2 px-4 py-3 border-b border-rim md:hidden shrink-0">
            <button
              type="button"
              onClick={() => navigate(props.base)}
              class="flex items-center gap-1.5 text-sm text-muted hover:text-txt transition-colors"
              aria-label={t("layout.back")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              {t("layout.back")}
            </button>
            <span class="text-sm font-medium text-txt ml-1">
              {(() => { const l = activeItem()?.label; return l ? (typeof l === "function" ? l() : l) : ""; })()}
            </span>
          </div>
        </Show>

        <div class="flex-1 overflow-y-auto">
          {props.children}
        </div>
      </main>
    </div>
  );
}

// ── Nav list ─────────────────────────────────────────────────────────────────

function SubPageNav(props: {
  base: string;
  items: SubPageItem[];
  activeKey: string;
}) {
  const { t } = useI18n();
  return (
    <nav class="py-2 overflow-y-auto flex-1" aria-label={t("layout.section_navigation")}>
      {props.items.map((item) => {
        const active = () => item.path === props.activeKey;
        return (
          <>
            <A
              href={`${props.base}/${item.path}`}
              class={[
                "flex items-center gap-3 mx-2 px-3 py-2 rounded-full text-sm",
                "transition-colors select-none",
                active()
                  ? "bg-elevated text-txt font-medium"
                  : "text-muted hover:bg-elevated/60 hover:text-txt",
              ].join(" ")}
            >
              {item.icon && (
                <span class="w-4 h-4 shrink-0 flex items-center justify-center opacity-80">
                  {item.icon}
                </span>
              )}
              <span class="flex-1 min-w-0 truncate">{typeof item.label === "function" ? item.label() : item.label}</span>
              <svg xmlns="http://www.w3.org/2000/svg"
                class="w-3.5 h-3.5 text-muted opacity-40 md:hidden shrink-0"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </A>
            {item.dividerAfter && <hr class="my-2 mx-3 border-rim" />}
          </>
        );
      })}
    </nav>
  );
}
