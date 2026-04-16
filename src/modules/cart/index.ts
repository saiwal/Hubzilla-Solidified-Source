import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "cart",
  routes: [
    { path: "/cart", component: () => import("./views/CartView") },
    { path: "/cart/:nick", component: () => import("./views/CartView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.cart"),
    icon: "grid",
    path: "/cart",
    href: () => `/cart/${usePageNick()()}`,
		context: "all",
  },
  slots: {
  },
  permissions: [],
});
