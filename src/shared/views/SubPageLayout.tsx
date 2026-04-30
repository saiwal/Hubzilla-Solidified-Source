import { type JSX, Show, createMemo } from "solid-js";
import { useLocation, useNavigate, A } from "@solidjs/router";
import { useViewerRole } from "@/shared/store/site-config";

export type SubPageContext = "owner" | "local" | "remote" | "anonymous" | "all";

export interface SubPageItem {
  path: string;
  label: string;
  icon?: JSX.Element;
  dividerBefore?: boolean;
  /** Who can see this nav item. Omit or use "all" for everyone. */
  context?: SubPageContext | SubPageContext[];
}

interface Props {
  base: string;
  items: SubPageItem[];
  activeKey: string;
  children: JSX.Element;
}

// role() returns ViewerRole which may include "admin" — accept string so we
// don't have to mirror every value of ViewerRole inside SubPageContext.
function isVisible(item: SubPageItem, role: string): boolean {
  if (!item.context || item.context === "all") return true;
  // "admin" is a superset of "owner" for visibility purposes
  const effectiveRole = role === "admin" ? "owner" : role;
  if (Array.isArray(item.context)) return item.context.includes(effectiveRole as SubPageContext);
  return item.context === effectiveRole;
}

export default function SubPageLayout(props: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const role = useViewerRole();

  const visibleItems = createMemo(() =>
    props.items.filter((item) => isVisible(item, role())),
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
          "shrink-0 flex flex-col border-rim bg-surface",
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
              aria-label="Back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
            <span class="text-sm font-medium text-txt ml-1">
              {activeItem()?.label ?? ""}
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
  return (
    <nav class="py-2 overflow-y-auto flex-1" aria-label="Section navigation">
      {props.items.map((item) => {
        const active = () => item.path === props.activeKey;
        return (
          <>
            {item.dividerBefore && <hr class="my-2 mx-3 border-rim" />}
            <A
              href={`${props.base}/${item.path}`}
              class={[
                "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm",
                "transition-colors select-none",
                active()
                  ? "bg-elevated text-txt font-medium"
                  : "text-muted hover:bg-elevated hover:text-txt",
              ].join(" ")}
            >
              {item.icon && (
                <span class="w-4 h-4 shrink-0 flex items-center justify-center opacity-80">
                  {item.icon}
                </span>
              )}
              <span class="flex-1 min-w-0 truncate">{item.label}</span>
              <svg xmlns="http://www.w3.org/2000/svg"
                class="w-3.5 h-3.5 text-muted opacity-40 md:hidden shrink-0"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </A>
          </>
        );
      })}
    </nav>
  );
}
