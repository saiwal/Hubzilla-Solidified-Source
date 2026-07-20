import type { RawDictionary } from "../namespaces/types";

export const post: RawDictionary["post"] = {
  // actions
  like:                 "Gefällt mir",
  dislike:              "Gefällt mir nicht",
  repeat:               "Wiederholen",
  reshare_with_comment: "Mit Kommentar teilen",
  copy_embed_code:      "Einbettungscode kopieren",
  more_sharing:         "Weitere Teilen-Optionen",
  star:                 "Markieren",
  unstar:               "Markierung entfernen",
  pin:                  "Oben anheften",
  unpin:                "Loslösen",
  pinned_indicator:     "Angeheftet",
  follow:               "Folgen",
  unfollow:             "Entfolgen",
  follow_for_notifs:    "Beitrag folgen für Benachrichtigungen",
  unfollow_post:        "Beitrag nicht mehr folgen",
  statistics:           "Statistiken",
  post_statistics:      "Beitragsstatistiken",
  view_source:          "Quelltext ansehen",
  import_post:          "Beitrag importieren",
  import:               "Importieren",
  original:             "Ursprünglicher Beitrag",
  toggle_comments:      "Kommentare ein-/ausblenden",
  toggle_flat:          "Zur flachen Ansicht wechseln",
  toggle_threaded:      "Zur Thread-Ansicht wechseln",
  flat:                 "Flach",
  threaded:             "Thread",
  flat_view:            "Flache Ansicht",
  threaded_view:        "Thread-Ansicht",
  refresh:              "Aktualisieren",
  more_actions:         "Weitere Aktionen",
  reply:                "Antworten",
  delete_post:          "Beitrag löschen",
  delete:               "Löschen",
  remove_from_feed:         "Aus deinem Feed entfernen",
  confirm:              "Bestätigen?",
  confirm_delete:       "Löschen bestätigen?",
  confirm_remove_from_feed: "Entfernen aus Feed bestätigen?",
  // badges
  op:                   "OP",
  op_title:             "Ursprünglicher Verfasser",
  new_badge:            "Neu",
  // counts
  comments_singular:    "Kommentar",
  comments_plural:      "Kommentare",
  // loading
  loading_comments:     "Kommentare werden geladen…",
  loading:              "Lädt…",
  loading_source:       "Quelltext wird geladen…",
  // stats tabs
  likes:                "Gefällt mir",
  dislikes:             "Gefällt mir nicht",
  repeats:              "Wiederholungen",
  no_activity:          "Keine Aktivitätsdetails verfügbar.",
  // source viewer
  cached:               "zwischengespeichert",
  generated:            "generiert",
  // fallbacks
  unknown:              "Unbekannt",
  // modal
  modal_title:          "Beitrag",
  modal_close:          "Schließen",
  load_error:           "Beitrag konnte nicht geladen werden",
  deleted_comment:      "[Kommentar gelöscht]",
  // Folder save
  save_to_folder:        "In Ordner speichern",
  new_folder_placeholder: "Neuer Ordnername…",
  add_folder:            "Hinzufügen",
  no_folders_yet:        "Noch keine Ordner — gib unten einen Namen ein, um einen zu erstellen",
  expand_all:            "Alle Threads erweitern",
  // Delivery report
  delivery_report:       "Zustellbericht",
  delivery_no_data:      "Keine Zustelldaten gefunden.",
  edited:                "Bearbeitet",
  edit:                  "Bearbeiten",
  // expiry
  expires:               "Läuft ab",
  expired_badge:         "Abgelaufen",
  expired_title:         "Dieser Beitrag ist abgelaufen und nur für dich sichtbar",
  // scheduled (delayed publish)
  scheduled_badge:       "Geplant",
  scheduled_title:       "Wird veröffentlicht am",
  // direct message (item_private === 2)
  dm_badge:              "DM",
  dm_title:              "Direktnachricht",
};
