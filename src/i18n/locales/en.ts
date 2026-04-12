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
    logout: string;
    login: string;
    remote_login: string;
    register: string;
  };
  layout: {
    title: string;
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
    logout: "Logout",
    login: "Login",
    remote_login: "Remote Login",
    register: "Register",
  },
  layout: {
    title: "Hubzilla",
  },
};
