// Single source of truth for the dictionary shape.
// All locale files import from here — never redeclare this type locally.

export type RawDictionary = {
  nav: {
    articles:      string;
    calendar:      string;
    cart:          string;
    chat:          string;
    directory:     string;
    files:         string;
    help:          string;
    hq:            string;
    network:       string;
    channel:       string;
    photos:        string;
    notifications: string;
    settings:      string;
    admin:         string;
    webpages:      string;
    wiki:          string;
    tools:         string;
    // action items
    profile:       string;
    edit_profile:  string;
    channels:      string;
    navhome:       string;
    logout:        string;
    login:         string;
    remote_login:  string;
    register:      string;
    siteinfo:      string;
    pubsites:      string;
    pubstream:     string;
  };
  layout: {
    title: string;
  };
  ui: {
    show_more: string;
    show_less: string;
    reply:     string;
    replies:   string;
  };
  widgets: {
    tags:           string;
    categories:     string;
    popular_posts:  string;
    no_tags:        string;
    no_categories:  string;
    no_popular:     string;
    load_error:     string;
    show_more_tags: string;
  };
  tools: {
    label:    string;
    calc:     string;
    qr:       string;
    unit:     string;
    base64:   string;
    password: string;
  };
};
