export type RawDictionary = {
  nav: {
		hq: string;
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
		hq : "HQ",
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
