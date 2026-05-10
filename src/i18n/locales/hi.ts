export type RawDictionary = {
  nav: {
    articles: string;
    calendar: string;
    cart: string;
    chat: string;
    directory: string;
    files: string;
    help: string;
    hq: string;
    network: string;
    channel: string;
    photos: string;
    notifications: string;
    settings: string;
    admin: string;
    webpages: string;
    wiki: string;
    // action items
    profile: string;
    edit_profile: string;
    channels: string;
    navhome: string;
    logout: string;
    login: string;
    remote_login: string;
    register: string;
    siteinfo: string;
    pubsites: string;
    pubstream: string;
  };
  layout: {
    title: string;
  };
  ui: {
    show_more: string;
    show_less: string;
    reply: string;
    replies: string;
  };
  widgets: {
    tags: string;
    categories: string;
    popular_posts: string;
    no_tags: string;
    no_categories: string;
    no_popular: string;
    load_error: string;
    show_more_tags: string;
  };
};

export const dict: RawDictionary = {
  nav: {
    articles: "लेख",
    calendar: "कैलेंडर",
    cart: "कार्ट",
    chat: "चैटरूम",
    directory: "निर्देशिका",
    files: "फ़ाइलें",
    help: "सहायता",
    hq: "मुख्यालय",
    network: "नेटवर्क",
    channel: "चैनल",
    photos: "फ़ोटो",
    notifications: "सूचनाएँ",
    settings: "सेटिंग्स",
    admin: "प्रशासक",
    webpages: "वेबपेज",
    wiki: "विकी",
    // action items
    profile: "प्रोफ़ाइल",
    edit_profile: "प्रोफ़ाइल संपादित करें",
    channels: "चैनल्स",
    navhome: "मुखपृष्ठ पर जाएँ",
    logout: "लॉगआउट",
    login: "लॉगिन",
    remote_login: "रिमोट लॉगिन",
    register: "पंजीकरण",
    siteinfo: "साइट जानकारी",
    pubsites: "पब्लिक साइट्स",
    pubstream: "पब्लिक स्ट्रीम",
  },
  layout: {
    title: "Hubzilla",
  },
  ui: {
    show_more: "और दिखाएँ",
    show_less: "कम दिखाएँ",
    reply: "उत्तर",
    replies: "उत्तर",
  },
  widgets: {
    tags: "टैग्स",
    categories: "श्रेणियाँ",
    popular_posts: "लोकप्रिय पोस्ट",
    no_tags: "कोई टैग नहीं",
    no_categories: "कोई श्रेणी नहीं",
    no_popular: "कोई लोकप्रिय पोस्ट नहीं",
    load_error: "लोड त्रुटि",
    show_more_tags: "और टैग्स दिखाएँ",
  },
};
