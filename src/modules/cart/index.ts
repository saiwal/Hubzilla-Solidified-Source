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
    icon: "cart",
    path: "/cart",
    href: () => `/cart/${usePageNick()()}`,
		context: "all",
  },
  widgets: [
    {
      id: "cart.cart",
      label: () => useI18n().t("widgets.shopping_cart"),
      loader: () => import("./widgets/CartWidget"),
      slot: "right",
    },
  ],
  permissions: [],
});
