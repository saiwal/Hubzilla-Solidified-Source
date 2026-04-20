import { A } from "@solidjs/router";
import type { Component, JSX } from "solid-js";
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
  MdFillWeb_asset,
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
  // MdFillApps,
  // MdFillClose,
  // MdFillChevronRight,
  // MdFillMoreHoriz,
} from "solid-icons/md";

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
  calendar: (s) => <MdFillCalendar_month size={s} />,
  chat: (s) => <MdFillChat size={s} />,
  bookmark: (s) => <MdFillBookmark size={s} />,
  article: (s) => <MdFillArticle size={s} />,
  articles: (s) => <MdFillArticle size={s} />,
  cart: (s) => <MdFillShopping_cart size={s} />,
  help: (s) => <MdFillHelp size={s} />,
  webpages: (s) => <MdFillWeb_asset size={s} />,
  wiki: (s) => <MdFillEdit_note size={s} />,
  connections: (s) => <MdFillPeople size={s} />,
  directory: (s) => <MdFillAccount_tree size={s} />,
  public: (s) => <MdFillPublic size={s} />,
  groups: (s) => <MdFillLock size={s} />,
  pdl: (s) => <MdFillView_column size={s} />,
  network: (s) => <MdFillRss_feed size={s} />,
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

const NavItem: Component<Props> = (props) => {
  const href = () =>
    typeof props.href === "function" ? props.href() : props.href;
  const label = () =>
    typeof props.label === "function" ? props.label() : props.label;

  return (
    <A
      href={href()}
      end={href() === "/"}
      class="group relative flex items-center gap-3 rounded-xl px-2.5 py-2
             text-sm text-[var(--nav-text)] transition-colors duration-150
             hover:bg-[var(--nav-hover)] hover:text-[var(--nav-text-active)]"
      activeClass="!bg-[var(--nav-active)] !text-[var(--nav-text-active)] font-medium"
    >
      <span class="shrink-0 w-5 h-5 flex items-center justify-center">
        {getNavIcon(props.icon, 20)}
      </span>
      <span class="truncate leading-none label">{label()}</span>
    </A>
  );
};

export default NavItem;
