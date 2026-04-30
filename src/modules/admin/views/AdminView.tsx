import { lazy, createMemo, Suspense } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useLocation } from "@solidjs/router";
import SubPageLayout from "@/shared/views/SubPageLayout";
import { ADMIN_ITEMS } from "../index";

// ── Lazy section components ──────────────────────────────────────────────────

const SECTIONS: Record<string, ReturnType<typeof lazy>> = {
  summary:       lazy(() => import("./sections/SummarySection")),
  site:       lazy(() => import("./sections/SiteSection")),
};

const DEFAULT_SECTION = "summary";

// ── View ─────────────────────────────────────────────────────────────────────

export default function AdminView() {
  const location = useLocation();

  const activeKey = createMemo<string>(() => {
    const seg = location.pathname.replace(/^\/admin\/?/, "").split("/")[0];
    return seg && seg in SECTIONS ? seg : DEFAULT_SECTION;
  });

  return (
    <SubPageLayout base="/admin" items={ADMIN_ITEMS} activeKey={activeKey()}>
      <Suspense fallback={<SectionSkeleton />}>
        <Dynamic component={SECTIONS[activeKey()]} />
      </Suspense>
    </SubPageLayout>
  );
}

function SectionSkeleton() {
  return (
    <div class="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-4 animate-pulse">
      <div class="h-5 w-40 rounded bg-elevated" />
      <div class="h-px w-full bg-rim" />
      <div class="space-y-3">
        <div class="h-4 w-3/4 rounded bg-elevated" />
        <div class="h-4 w-1/2 rounded bg-elevated" />
        <div class="h-4 w-2/3 rounded bg-elevated" />
      </div>
    </div>
  );
}
