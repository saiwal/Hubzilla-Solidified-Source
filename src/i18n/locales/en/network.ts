import type { RawDictionary } from "../namespaces/types";

export const network: RawDictionary["network"] = {
  // Sort order buttons
  latest:               "Latest",
  active:               "Active",
  unthreaded:           "Unthreaded",
  // View mode labels
  feed:                 "Feed",
  grid:                 "Grid",
  list:                 "List",
  inbox:                "Inbox",
  // Filter toggle buttons
  refresh:              "Refresh",
  starred:              "Starred",
  following:            "Following",
  conversations:        "Conversations",
  direct_messages:      "Direct messages",
  events:               "Events",
  // Connection filter
  filter_by_connection: "Filter by connection",
  connection_placeholder: "Connection…",
  remove:               "Remove",
  // Search
  search:               "Search",
  search_placeholder:   "Search or paste URL…",
  // Status
  fetching_post:        "Fetching post…",
  filters:              "Filters",
  // Advanced filters
  more_filters:         "More filters",
  clear_filters:        "Clear filters",
  tag:                  "Tag",
  tag_placeholder:      "e.g. solidjs",
  date_from:            "From",
  date_to:              "To",
  affinity_min:         "Affinity min",
  affinity_max:         "Affinity max",
  affinity_min_placeholder: "0",
  affinity_max_placeholder: "100",
  // Loading
  loading:              "Loading...",
  // New posts badge
  new_post:             "post",
  new_posts:            "posts",
  // Stream end
  load_more:            "Load more",
  all_caught_up:        "You're all caught up",
  // Saved searches
  saved_searches:          "Saved searches",
  save_search:             "Save search",
  save_search_placeholder: "Search name…",
  search_saved:            "Search saved",
  delete_saved_search:     "Delete saved search",
};
