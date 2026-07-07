import { type Component } from "solid-js";

export type NavContext =
  | "owner"
  | "local"
  | "remote"
  | "anonymous"
  | "all"
  | "admin";

export interface NavItemDef {
  label: string | (() => string);
  icon: string;
  path: string;
  href: string | (() => string);
  context?: NavContext | NavContext[]; // single or array of allowed roles
  hidden?: boolean;
}

type SlotLoader = () => Promise<{ default: Component }>;

export type ComponentLoader<P extends Record<string, any> = {}> = () => Promise<{ default: Component<P> }>;

export type WidgetSlotName = "right" | "leftBottom" | "mainTop" | "rightVisitor";

/** Props every widget component is mounted with. */
export interface WidgetProps {
  /** Per-instance settings for multiInstance widgets; absent for singletons. */
  config?: Record<string, unknown>;
}

/** Props for a widget's configComponent (shown in the edit-mode config panel). */
export interface WidgetConfigProps {
  config: Record<string, unknown>;
  /** Persist the instance config. The panel closes on success. */
  onSave: (config: Record<string, unknown>) => void;
}

export interface WidgetDef {
  /** Stable identifier, persisted in user layouts — never rename once shipped. Convention: "<moduleId>.<name>". */
  id: string;
  /** Human-readable name for the widget picker UI. */
  label: string | (() => string);
  loader: ComponentLoader<WidgetProps>;
  slot: WidgetSlotName;
  /** Module ids where the widget appears out of the box. Defaults to the registering module. */
  defaultModules?: string[];
  /** Module ids where the widget can be placed by the user, or "any". Defaults to defaultModules. */
  contexts?: string[] | "any";
  /** Always mounted regardless of active module; never torn down on navigation. */
  global?: boolean;
  /**
   * false = only rendered for authenticated local users. Set on widgets that
   * show viewer-private data (drafts, bookmarks) so visitors to public pages
   * never mount them. Default true.
   */
  visitorVisible?: boolean;
  /**
   * true = the widget may be placed several times in the same slot; each
   * placement is an instance with its own key and config. The picker keeps
   * offering the widget when instances are already present.
   */
  multiInstance?: boolean;
  /**
   * Settings form rendered in the edit-mode config panel of each instance.
   * Receives the current config and an onSave callback.
   */
  configComponent?: ComponentLoader<WidgetConfigProps>;
}

/** @deprecated Use ModuleDef.widgets instead. Ignored by the registry. */
export interface SlotsDef {
  right?: SlotLoader | SlotLoader[];
  leftBottom?: SlotLoader | SlotLoader[];
  mainTop?: SlotLoader | SlotLoader[];
  rightVisitor?: SlotLoader | SlotLoader[];
 help?: () => Promise<{ default: Component }>;
}

export interface ModuleDef {
  id: string;
  routes: RouteDef[];
  navItem?: NavItemDef;
  /** @deprecated Use widgets instead. Ignored by the registry. */
  slots?: SlotsDef;
  widgets?: WidgetDef[];
  permissions?: string[];
  /** Hubzilla app name (e.g. "Photos"). If set, module only renders when this app is installed. */
  appName?: string;
  /** true = only rendered for authenticated users; anonymous visitors are redirected to /login. */
  requiresAuth?: boolean;
}

export interface RouteDef {
  path: string;
  component: () => Promise<{ default: Component }>;
  /** Set automatically by registerModule — do not supply manually. */
  moduleId?: string;
}
