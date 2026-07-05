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
    {
      // Opt-in showcase card; place several, each configured with its own sku
      id: "cart.item_card",
      label: () => useI18n().t("widgets.item_card"),
      loader: () => import("./widgets/ItemCardWidget"),
      slot: "right",
      defaultModules: [],
      contexts: ["channel", "profile", "cart"],
      multiInstance: true,
      configComponent: () => import("./widgets/ItemCardConfig"),
    },
  ],
  permissions: [],
});
