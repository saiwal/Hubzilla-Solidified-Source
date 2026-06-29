import type { Component } from "solid-js";
import type * as i18n from "@solid-primitives/i18n";
import type { RawDictionary } from "@/i18n/locales/namespaces/types";
import {
  MdOutlineRadio_button_checked,
  MdOutlineAccount_tree,
  MdOutlineView_in_ar,
  MdOutlineGrid_on,
  MdOutlineGrid_4x4,
  MdOutlineNumbers,
  MdOutlineFlip,
  MdOutlineWater,
  MdOutlineBlur_circular,
  MdOutlineCompare,
  MdOutlineColor_lens,
  MdOutlineDirections_run,
  MdOutlineCalculate,
  MdOutlineLightbulb,
  MdOutlineLoop,
  MdOutlineElectric_bolt,
  MdOutlineMap,
  MdOutlineFlag,
  MdOutlineGrid_view,
  MdOutlineHub,
  MdOutlineDevice_hub,
  MdOutlineCrop_free,
  MdOutlineApps,
  MdOutlineGrade,
  MdOutlineCircle,
  MdOutlineStacked_bar_chart,
  MdOutlineCrop_square,
  MdOutlineSelect_all,
  MdOutlineSignpost,
  MdOutlineBlur_on,
  MdOutlineShuffle,
  MdOutlineShow_chart,
  MdOutlineGrid_3x3,
  MdOutlineBeach_access,
  MdOutlineBar_chart,
  MdOutlineDirections_railway,
  MdOutlineRotate_90_degrees_ccw,
  MdOutlineGames,
  MdOutlineCompare_arrows,
  MdOutlineSwap_horiz,
  MdOutlineBubble_chart,
} from "solid-icons/md";

type TranslatorKey = keyof i18n.Flatten<RawDictionary>;

export type GameId =
  | "blackbox" | "bridges"  | "cube"     | "dominosa" | "fifteen"
  | "filling"  | "flip"     | "flood"    | "galaxies" | "group"
  | "guess"    | "inertia"  | "keen"     | "lightup"  | "loopy"
  | "magnets"  | "map"      | "mines"    | "mosaic"   | "net"
  | "netslide" | "palisade" | "pattern"  | "pearl"    | "pegs"
  | "range"    | "rect"     | "samegame" | "signpost" | "singles"
  | "sixteen"  | "slant"    | "solo"     | "tents"    | "towers"
  | "tracks"   | "twiddle"  | "undead"   | "unequal"  | "unruly"
  | "untangle";

export type GameEntry = {
  id: GameId;
  labelKey: TranslatorKey;
  icon: Component<{ class?: string }>;
};

export const GAMES: GameEntry[] = [
  { id: "blackbox",  labelKey: "games.blackbox",  icon: MdOutlineRadio_button_checked },
  { id: "bridges",   labelKey: "games.bridges",   icon: MdOutlineAccount_tree },
  { id: "cube",      labelKey: "games.cube",      icon: MdOutlineView_in_ar },
  { id: "dominosa",  labelKey: "games.dominosa",  icon: MdOutlineGrid_on },
  { id: "fifteen",   labelKey: "games.fifteen",   icon: MdOutlineGrid_4x4 },
  { id: "filling",   labelKey: "games.filling",   icon: MdOutlineNumbers },
  { id: "flip",      labelKey: "games.flip",      icon: MdOutlineFlip },
  { id: "flood",     labelKey: "games.flood",     icon: MdOutlineWater },
  { id: "galaxies",  labelKey: "games.galaxies",  icon: MdOutlineBlur_circular },
  { id: "group",     labelKey: "games.group",     icon: MdOutlineCompare },
  { id: "guess",     labelKey: "games.guess",     icon: MdOutlineColor_lens },
  { id: "inertia",   labelKey: "games.inertia",   icon: MdOutlineDirections_run },
  { id: "keen",      labelKey: "games.keen",      icon: MdOutlineCalculate },
  { id: "lightup",   labelKey: "games.lightup",   icon: MdOutlineLightbulb },
  { id: "loopy",     labelKey: "games.loopy",     icon: MdOutlineLoop },
  { id: "magnets",   labelKey: "games.magnets",   icon: MdOutlineElectric_bolt },
  { id: "map",       labelKey: "games.map",       icon: MdOutlineMap },
  { id: "mines",     labelKey: "games.mines",     icon: MdOutlineFlag },
  { id: "mosaic",    labelKey: "games.mosaic",    icon: MdOutlineGrid_view },
  { id: "net",       labelKey: "games.net",       icon: MdOutlineHub },
  { id: "netslide",  labelKey: "games.netslide",  icon: MdOutlineDevice_hub },
  { id: "palisade",  labelKey: "games.palisade",  icon: MdOutlineCrop_free },
  { id: "pattern",   labelKey: "games.pattern",   icon: MdOutlineApps },
  { id: "pearl",     labelKey: "games.pearl",     icon: MdOutlineGrade },
  { id: "pegs",      labelKey: "games.pegs",      icon: MdOutlineCircle },
  { id: "range",     labelKey: "games.range",     icon: MdOutlineStacked_bar_chart },
  { id: "rect",      labelKey: "games.rect",      icon: MdOutlineCrop_square },
  { id: "samegame",  labelKey: "games.samegame",  icon: MdOutlineSelect_all },
  { id: "signpost",  labelKey: "games.signpost",  icon: MdOutlineSignpost },
  { id: "singles",   labelKey: "games.singles",   icon: MdOutlineBlur_on },
  { id: "sixteen",   labelKey: "games.sixteen",   icon: MdOutlineShuffle },
  { id: "slant",     labelKey: "games.slant",     icon: MdOutlineShow_chart },
  { id: "solo",      labelKey: "games.solo",      icon: MdOutlineGrid_3x3 },
  { id: "tents",     labelKey: "games.tents",     icon: MdOutlineBeach_access },
  { id: "towers",    labelKey: "games.towers",    icon: MdOutlineBar_chart },
  { id: "tracks",    labelKey: "games.tracks",    icon: MdOutlineDirections_railway },
  { id: "twiddle",   labelKey: "games.twiddle",   icon: MdOutlineRotate_90_degrees_ccw },
  { id: "undead",    labelKey: "games.undead",    icon: MdOutlineGames },
  { id: "unequal",   labelKey: "games.unequal",   icon: MdOutlineCompare_arrows },
  { id: "unruly",    labelKey: "games.unruly",    icon: MdOutlineSwap_horiz },
  { id: "untangle",  labelKey: "games.untangle",  icon: MdOutlineBubble_chart },
];
