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
    articles: "Articles",
    calendar: "Calendar",
    cart: "Cart",
    chat: "Chatrooms",
    directory: "Directory",
    files: "Files",
    help: "Help",
    hq: "HQ",
    network: "Network",
    channel: "Channel",
    photos: "Photos",
    notifications: "Notifications",
    settings: "Settings",
    admin: "Admin",
    webpages: "Webpages",
    wiki: "Wiki",
    // action items
    profile: "Profile",
    edit_profile: "Edit Profile",
    channels: "Channels",
    navhome: "Take me Home",
    logout: "Logout",
    login: "Login",
    remote_login: "Remote Login",
    register: "Register",
    siteinfo: "Siteinfo",
    pubsites: "Pubsites",
    pubstream: "Pubstream",
  },
  layout: {
    title: "Hubzilla",
  },
  ui: {
    show_more: "Show more",
    show_less: "Show less",
    reply: "reply",
    replies: "replies",
  },
  widgets: {
    tags: "Tags",
    categories: "Categories",
    popular_posts: "Popular Posts",
    no_tags: "No Tags",
    no_categories: "No Categories",
    no_popular: "No Popular Posts",
    load_error: "Load Error",
    show_more_tags: "Show more tags",
  },
};
