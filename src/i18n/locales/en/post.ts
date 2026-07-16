import type { RawDictionary } from "../namespaces/types";

export const post: RawDictionary["post"] = {
  // actions
  like:                 "Like",
  dislike:              "Dislike",
  repeat:               "Repeat",
  reshare_with_comment: "Reshare with comment",
  copy_embed_code:      "Copy embed code",
  more_sharing:         "More sharing options",
  star:                 "Star",
  unstar:               "Unstar",
  follow:               "Follow",
  unfollow:             "Unfollow",
  follow_for_notifs:    "Follow post for notifications",
  unfollow_post:        "Unfollow post",
  statistics:           "Statistics",
  post_statistics:      "Post Statistics",
  view_source:          "View source",
  import_post:          "Import post",
  import:               "Import",
  original:             "Original post",
  toggle_comments:      "Toggle comments",
  toggle_flat:          "Switch to flat view",
  toggle_threaded:      "Switch to threaded view",
  flat:                 "Flat",
  threaded:             "Threaded",
  flat_view:            "Flat view",
  threaded_view:        "Threaded view",
  refresh:              "Refresh",
  more_actions:         "More actions",
  reply:                "Reply",
  delete_post:          "Delete post",
  delete:               "Delete",
  confirm:              "Confirm?",
  confirm_delete:       "Confirm delete?",
  // badges
  op:                   "OP",
  op_title:             "Original poster",
  new_badge:            "New",
  // counts
  comments_singular:    "comment",
  comments_plural:      "comments",
  // loading
  loading_comments:     "Loading comments…",
  loading:              "Loading…",
  loading_source:       "Loading source…",
  // stats tabs
  likes:                "Likes",
  dislikes:             "Dislikes",
  repeats:              "Repeats",
  no_activity:          "No activity details available.",
  // source viewer
  cached:               "cached",
  generated:            "generated",
  // fallbacks
  unknown:              "Unknown",
  // modal
  modal_title:          "Post",
  modal_close:          "Close",
  load_error:           "Failed to load post",
  deleted_comment:      "[Comment deleted]",
  // Folder save
  save_to_folder:        "Save to folder",
  new_folder_placeholder: "New folder name…",
  add_folder:            "Add",
  no_folders_yet:        "No folders yet — type a name below to create one",
  expand_all:            "Expand all threads",
  // Delivery report
  delivery_report:       "Delivery report",
  delivery_no_data:      "No delivery records found.",
  edited:                "Edited",
  edit:                  "Edit",
  // expiry
  expires:               "Expires",
  expired_badge:         "Expired",
  expired_title:         "This post has expired and is only visible to you",
  // scheduled (delayed publish)
  scheduled_badge:       "Scheduled",
  scheduled_title:       "Publishes at",
  // direct message (item_private === 2)
  dm_badge:              "DM",
  dm_title:              "Direct message",
};
