export type RawDictionary = {
  nav: {
		articles: string;
		calendar: string;
		cart: string;
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
		directory: "Directory",
		files: "Files",
		help: "Help",
		hq : "HQ",
    network: "Network",
    channel: "Channel",
    photos: "Photos",
    notifications: "Notifications",
		settings: "Settings",
		admin: "Admin",
		webpages: "Webpages",
		wiki: "Wiki",
  },
  layout: {
    title: "Hubzilla",
  },
};
