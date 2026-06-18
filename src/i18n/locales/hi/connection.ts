import type { RawDictionary } from "../namespaces/types";

export const connection: RawDictionary["connection"] = {
  close:          "बंद करें",
  role:           "भूमिका",
  role_loading:   "भूमिकाएँ लोड हो रही हैं…",
  no_role:        "कोई भूमिका नहीं",
  closeness:      "निकटता",
  distant:        "दूर",
  close_label:    "निकट",
  connected:      "जुड़े हुए",
  pending:        "लंबित",
  confirm_remove: "हटाने की पुष्टि करें?",
  remove:         "हटाएँ",
  cancel:         "रद्द करें",
  saving:         "सहेजा जा रहा है…",
  save:           "सहेजें",
  // Tabs
  tab_settings:   "सेटिंग्स",
  tab_permissions: "अनुमतियाँ",
  tab_filters:    "फ़िल्टर",
  // Status flags
  flag_blocked:   "अवरुद्ध",
  flag_ignored:   "अनदेखा",
  flag_archived:  "संग्रहीत",
  flag_hidden:    "छुपा हुआ",
  // Permissions table
  perms_their:    "उनकी",
  perms_my:       "मेरी",
  perms_loading:  "अनुमतियाँ लोड हो रही हैं…",
  perms_error:    "अनुमतियाँ लोड नहीं हो सकीं।",
  // Affinity slider labels
  aff_me:             "मैं",
  aff_family:         "परिवार",
  aff_friends:        "मित्र",
  aff_acquaintances:  "परिचित",
  aff_all:            "सभी",
  // Content filters
  filter_incl:      "केवल इन पोस्ट को आयात करें",
  filter_incl_hint: "शब्द, #टैग, /पैटर्न/, या lang=xx — प्रति पंक्ति एक। सभी आयात करने के लिए खाली छोड़ें।",
  filter_excl:      "इन पोस्ट को आयात न करें",
  filter_excl_hint: "शब्द, #टैग, /पैटर्न/, या lang=xx — प्रति पंक्ति एक। कुछ भी न छोड़ने के लिए खाली छोड़ें।",
};
