import { lazy, createMemo, Suspense } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useLocation } from "@solidjs/router";
import SubPageLayout from "@/shared/views/SubPageLayout";
import { useViewerRole } from "@/shared/store/site-config";
import { CONNECTIONS_ITEMS } from "../index";

const SECTIONS: Record<string, ReturnType<typeof lazy>> = {
  "connections":           lazy(() => import("./sections/ConnectionsSection")),
  "hubs":           lazy(() => import("./sections/HubsSection")),
  "people":      lazy(() => import("./sections/DirectorySection")),
  "privacy-groups": lazy(() => import("./sections/PrivacyGroupsSection")),
};

// Per-role default: what section to land on when hitting /directory bare
const DEFAULT_BY_ROLE: Partial<Record<string, string>> = {
  owner:     "connections",
  local:     "people",
  remote:    "people",
  anonymous: "people",
};

export default function ConnectionsShellView() {
  const location = useLocation();
  const role = useViewerRole();

  const activeKey = createMemo<string>(() => {
    const seg = location.pathname.replace(/^\/directory\/?/, "").split("/")[0];
    if (seg && seg in SECTIONS) return seg;
    // No segment — pick the role-appropriate default
    return DEFAULT_BY_ROLE[role()] ?? "people";
  });

  return (
    <SubPageLayout base="/directory" items={CONNECTIONS_ITEMS} activeKey={activeKey()}>
      <Suspense fallback={<SectionSkeleton />}>
        <Dynamic component={SECTIONS[activeKey()]} />
      </Suspense>
    </SubPageLayout>
  );
}

function SectionSkeleton() {
  return (
    <div class="px-4 md:px-6 py-6 space-y-4 animate-pulse">
      <div class="h-5 w-40 rounded bg-elevated" />
      <div class="h-px w-full bg-rim" />
      <div class="space-y-3">
        {[...Array(5)].map(() => (
          <div class="rounded-lg border border-rim bg-surface p-3 flex items-center gap-3">
            <div class="w-11 h-11 rounded-full bg-overlay shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-3.5 bg-overlay rounded w-1/3" />
              <div class="h-3 bg-overlay rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
