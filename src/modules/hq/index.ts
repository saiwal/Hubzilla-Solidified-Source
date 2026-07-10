import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { notificationsWidget, pinnedChatWidget } from "@/shared/slots";

registerModule({
  id: "hq",
  routes: [{ path: "/hq", component: () => import("./views/HqView") }],
  requiresAuth: true,
  navItem: {
    label: () => useI18n().t("nav.hq"),
    icon: "dashboard",
    path: "/hq",
    href: "/hq",
    context: "owner",
  },
  widgets: [
    // Both are global: mounted on every page, not just /hq
    notificationsWidget,
    pinnedChatWidget,
    // The dashboard itself, in the mainTop banner slot Layout.tsx already
    // renders above the routed view — same slot the "sleek" blocks.* / _top
    // widgets use, so users can rearrange, remove, or add to these too.
    {
      id: "hq.perfstats",
      label: () => useI18n().t("hq.performance"),
      loader: () => import("./widgets/PerfStatsWidget"),
      slot: "mainTop",
      defaultModules: ["hq"],
      contexts: ["hq"],
      helpTarget: "hq.performance_widget",
    },
    {
      id: "hq.composer",
      label: () => useI18n().t("hq.post_composer"),
      loader: () => import("./widgets/HqComposer"),
      slot: "mainTop",
      defaultModules: ["hq"],
      contexts: ["hq"],
      helpTarget: "hq.post_composer",
    },
    {
      id: "hq.drafts",
      label: () => useI18n().t("hq.drafts"),
      loader: () => import("./widgets/DraftsWidget"),
      slot: "mainTop",
      defaultModules: ["hq"],
      contexts: ["hq"],
      helpTarget: "hq.drafts_widget",
    },
    {
      // Local users only — mirrors the old `auth()?.isLocal` gate in HqView
      id: "hq.upcoming_events",
      label: () => useI18n().t("hq.upcoming_events"),
      loader: () => import("./widgets/UpcomingEventsWidget"),
      slot: "mainTop",
      defaultModules: ["hq"],
      contexts: ["hq"],
      visitorVisible: false,
      helpTarget: "hq.upcoming_events_widget",
    },
    {
      id: "hq.messages",
      label: () => useI18n().t("hq.messages"),
      loader: () => import("./widgets/HqMessagesWidget"),
      slot: "mainTop",
      defaultModules: ["hq"],
      contexts: ["hq"],
      helpTarget: "hq.messages_widget",
    },
    // Single-tab variants of hq.messages, opt-in via the widget picker so the
    // dashboard doesn't default to 5 message feeds at once.
    {
      id: "hq.messages.direct",
      label: () => useI18n().t("hq.msg_tab_direct"),
      loader: () => import("./widgets/HqDirectMessagesWidget"),
      slot: "mainTop",
      defaultModules: [],
      contexts: ["hq"],
      helpTarget: "hq.messages_widget",
    },
    {
      id: "hq.messages.starred",
      label: () => useI18n().t("hq.msg_tab_starred"),
      loader: () => import("./widgets/HqStarredMessagesWidget"),
      slot: "mainTop",
      defaultModules: [],
      contexts: ["hq"],
      helpTarget: "hq.messages_widget",
    },
    {
      id: "hq.messages.notices",
      label: () => useI18n().t("hq.msg_tab_notices"),
      loader: () => import("./widgets/HqNoticesWidget"),
      slot: "mainTop",
      defaultModules: [],
      contexts: ["hq"],
      helpTarget: "hq.messages_widget",
    },
    {
      id: "hq.messages.folders",
      label: () => useI18n().t("hq.msg_tab_folders"),
      loader: () => import("./widgets/HqFoldersWidget"),
      slot: "mainTop",
      defaultModules: [],
      contexts: ["hq"],
      helpTarget: "hq.messages_widget",
    },
  ],
  permissions: [],
});
