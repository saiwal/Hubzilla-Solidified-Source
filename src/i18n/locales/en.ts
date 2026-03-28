export type RawDictionary = {
  nav: {
		dashboard: string;
    network: string;
    channel: string;
    photos: string;
    notifications: string;
		settings: string;
  };
  layout: {
    title: string;
  };
};

export const dict: RawDictionary = {
  nav: {
		dashboard: "Dashboard",
    network: "Network",
    channel: "Channel",
    photos: "Photos",
    notifications: "Notifications",
		settings: "Settings",
  },
  layout: {
    title: "Hubzilla",
  },
};
