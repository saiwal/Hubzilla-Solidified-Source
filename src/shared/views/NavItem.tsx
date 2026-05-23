import { A } from "@solidjs/router";
import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";
import {
  MdFillHome,
  MdFillGrid_view,
  MdFillSpace_dashboard,
  MdFillMail,
  MdFillImage,
  MdFillFolder,
  MdFillCalendar_month,
  MdFillChat,
  MdFillBookmark,
  MdFillArticle,
  MdFillShopping_cart,
  MdFillHelp,
  MdFillWeb,
  MdFillEdit_note,
  MdFillPeople,
  MdFillAccount_tree,
  MdFillPublic,
  MdFillLock,
  MdFillView_column,
  MdFillSettings,
  MdFillManage_accounts,
  MdFillLogout,
  MdFillLogin,
  MdFillPerson_add,
  MdFillAdmin_panel_settings,
  MdFillPerson,
  MdFillEdit,
  MdFillRss_feed,
  MdFillNote,
  MdFillHardware,
} from "solid-icons/md";

// Bootstrap Icon name → our ICON_MAP key
const BI_TO_ICON: Record<string, string> = {
  newspaper: "articles",
  "calendar-date": "calendar",
  "calendar-event": "calendar",
  cart: "cart",
  "chat-text": "chat",
  "chat-dots": "chat",
  "person-circle": "hq",
  "grid-3x3": "network",
  "layout-text-sidebar": "webpages",
  "pencil-square": "wiki",
  bookmark: "bookmark",
  "person-vcard": "person",
  house: "home",
  people: "connections",
  "person-lock": "settings",
  "diagram-3": "directory",
  folder: "cloud",
  "question-lg": "help",
  "question-circle": "help",
  "person-plus": "register",
  sticky: "notes",
  "columns-gap": "pdl",
  image: "photos",
  "pencil-fill": "edit",
  "file-lock": "groups",
  globe: "pubstream",
  "person-lines-fill": "connections",
  rss: "network",
  search: "grid",
};

export function biToNavIcon(biName: string): string {
  return BI_TO_ICON[biName] ?? "";
}

const ICON_MAP: Record<string, (size: number) => JSX.Element> = {
  home: (s) => <MdFillHome size={s} />,
  grid: (s) => <MdFillGrid_view size={s} />,
  dashboard: (s) => <MdFillSpace_dashboard size={s} />,
  hq: (s) => <MdFillSpace_dashboard size={s} />,
  mail: (s) => <MdFillMail size={s} />,
  image: (s) => <MdFillImage size={s} />,
  photos: (s) => <MdFillImage size={s} />,
  folder: (s) => <MdFillFolder size={s} />,
  files: (s) => <MdFillFolder size={s} />,
  cloud: (s) => <MdFillFolder size={s} />,
  calendar: (s) => <MdFillCalendar_month size={s} />,
  chat: (s) => <MdFillChat size={s} />,
  bookmark: (s) => <MdFillBookmark size={s} />,
  article: (s) => <MdFillArticle size={s} />,
  articles: (s) => <MdFillArticle size={s} />,
  cart: (s) => <MdFillShopping_cart size={s} />,
  help: (s) => <MdFillHelp size={s} />,
  webpages: (s) => <MdFillWeb size={s} />,
  wiki: (s) => <MdFillEdit_note size={s} />,
  connections: (s) => <MdFillPeople size={s} />,
  directory: (s) => <MdFillAccount_tree size={s} />,
  public: (s) => <MdFillPublic size={s} />,
  groups: (s) => <MdFillLock size={s} />,
  pdl: (s) => <MdFillView_column size={s} />,
  network: (s) => <MdFillRss_feed size={s} />,
  pubstream: (s) => <MdFillPublic size={s} />,
  channel: (s) => <MdFillPerson size={s} />,
  settings: (s) => <MdFillSettings size={s} />,
  manage: (s) => <MdFillManage_accounts size={s} />,
  logout: (s) => <MdFillLogout size={s} />,
  login: (s) => <MdFillLogin size={s} />,
  remote: (s) => <MdFillLogin size={s} />,
  navhome: (s) => <MdFillHome size={s} />,
  register: (s) => <MdFillPerson_add size={s} />,
  admin: (s) => <MdFillAdmin_panel_settings size={s} />,
  person: (s) => <MdFillPerson size={s} />,
  edit: (s) => <MdFillEdit size={s} />,
  notes: (s) => <MdFillNote size={s} />,
  tools: (s) => <MdFillHardware size={s} />,
};

export function getNavIcon(token?: string, size = 20): JSX.Element {
  if (!token) return <MdFillGrid_view size={size} />;
  const f = ICON_MAP[token];
  return f ? f(size) : <MdFillGrid_view size={size} />;
}

interface Props {
  href: string | (() => string);
  label: string | (() => string);
  icon?: string;
}

const itemClass =
  "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 " +
  "text-sm text-muted transition-colors duration-150 " +
  "hover:bg-elevated hover:text-txt";

const activeClass = "!bg-elevated !text-txt font-medium";

const NavItem: Component<Props> = (props) => {
  const href = () =>
    typeof props.href === "function" ? props.href() : props.href;
  const label = () =>
    typeof props.label === "function" ? props.label() : props.label;

  // Absolute URLs (http/https) must do a hard navigation so the target
  // domain serves its own theme rather than the SPA intercepting the route.
  const isAbsolute = () => /^https?:\/\//.test(href());

  const content = () => (
    <>
      <span class="shrink-0 w-5 h-5 flex items-center justify-center">
        {getNavIcon(props.icon, 20)}
      </span>
      <span class="truncate leading-none label">{label()}</span>
    </>
  );

  return (
    <Show
      when={isAbsolute()}
      fallback={
        <A href={href()} end={href() === "/"} class={itemClass} activeClass={activeClass}>
          {content()}
        </A>
      }
    >
      <a
        href={href()}
        class={itemClass}
        onClick={(e) => {
          e.preventDefault();
          window.location.replace(href());
        }}
      >
        {content()}
      </a>
    </Show>
  );
};

export default NavItem;
