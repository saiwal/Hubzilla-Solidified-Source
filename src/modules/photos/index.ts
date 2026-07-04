import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "photos",
  routes: [
    { path: "/photos", component: () => import("./views/PhotoView") },
    { path: "/photos/:nick", component: () => import("./views/PhotoView") },
    { path: "/photos/:nick/album", component: () => import("./views/PhotoView") },
    {
      path: "/photos/:nick/album/:datum",
      component: () => import("./views/PhotoView"),
    },
    {
      path: "/photos/:nick/image/:datum",
      component: () => import("./views/PhotoView"),
    },
  ],
  navItem: {
    label: () => useI18n().t("nav.photos"),
    icon: "photos",
    path: "/photos",
    href: () => `/photos/${usePageNick()()}`,
    context: "all",
  },
  widgets: [
    {
      id: "photos.albums",
      label: () => useI18n().t("widgets.photo_albums"),
      loader: () => import("./widgets/PhotosWidget"),
      slot: "right",
    },
  ],
  permissions: [],
  appName: "Photos",
});
