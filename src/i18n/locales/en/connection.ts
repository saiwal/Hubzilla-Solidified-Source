import type { RawDictionary } from "../namespaces/types";

export const connection: RawDictionary["connection"] = {
  close:          "Close",
  role:           "Role",
  role_loading:   "Loading roles…",
  no_role:        "No role",
  closeness:      "Closeness",
  distant:        "Distant",
  close_label:    "Close",
  connected:      "Connected",
  pending:        "Pending",
  confirm_remove: "Confirm remove?",
  remove:         "Remove",
  cancel:         "Cancel",
  saving:         "Saving…",
  save:           "Save",
  // Tabs
  tab_settings:   "Settings",
  tab_permissions: "Permissions",
  tab_filters:    "Filters",
  // Status flags
  flag_blocked:   "Blocked",
  flag_ignored:   "Ignored",
  flag_archived:  "Archived",
  flag_hidden:    "Hidden",
  // Permissions table
  perms_their:    "Their",
  perms_my:       "Mine",
  perms_loading:  "Loading permissions…",
  perms_error:    "Could not load permissions.",
  // Affinity slider labels
  aff_me:             "Me",
  aff_family:         "Family",
  aff_friends:        "Friends",
  aff_acquaintances:  "Acquaintances",
  aff_all:            "All",
  // Content filters
  filter_incl:      "Only import posts with",
  filter_incl_hint: "Words, #tags, /patterns/, or lang=xx — one per line. Leave blank to import all.",
  filter_excl:      "Do not import posts with",
  filter_excl_hint: "Words, #tags, /patterns/, or lang=xx — one per line. Leave blank to skip nothing.",
  // Privacy groups
  privacy_groups:   "Privacy Groups",
  // Profile assignment
  profile_label:    "Profile shown to contact",
  profile_default:  "Default profile",
};
