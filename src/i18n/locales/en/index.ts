import type { RawDictionary } from "../namespaces/types";
import { nav }     from "./nav";
import { layout }  from "./layout";
import { ui }      from "./ui";
import { widgets } from "./widgets";
import { tools }   from "./tools";
// ← import new namespace file here

export const dict: RawDictionary = {
  nav,
  layout,
  ui,
  widgets,
  tools,
  // ← and spread it here
};
