export type RawDictionary = {
  nav: {
    network: string;
    channel: string;
    photos: string;
    notifications: string;
  };
  layout: {
    title: string;
  };
};

export const dict: RawDictionary = {
  nav: {
    network: "Network",
    channel: "Channel",
    photos: "Photos",
    notifications: "Notifications",
  },
  layout: {
    title: "Hubzilla",
  },
};
