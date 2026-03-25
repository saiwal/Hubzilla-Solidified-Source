export interface NavItemConfig {
  label: string;
  href: string;
  featureKey?: string;
  pconfigGate?: { app: string; key: string };
  /** If true, href is a template — useNav will resolve it */
  dynamicHref?: boolean;
}

export const mainNav: NavItemConfig[] = [
  { label: "Dashboard",    href: "/"                    },
  { label: "Network Feed", href: "/network"             },
  { label: "Channel",      href: "/channel"             },
  { label: "Directory",    href: "/directory"           },
  { label: "Photos",       href: "/photos/:nick",       dynamicHref: true },
  { label: "Files",        href: "/files"               },
  { label: "Settings",     href: "/settings"            },
];
