import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "article",
  routes: [
    { path: "/articles", component: () => import("./views/ArticlesView") },
    { path: "/articles/:nick", component: () => import("./views/ArticlesView") },
	  { path: "/articles/:nick/:uuid", component: () => import("./views/ArticleView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.articles"),
    icon: "articles",
    path: "/articles",
    href: () => `/articles/${usePageNick()()}`,
		context: "all",
		hidden: false,
  },
  slots: {
  },
  permissions: [],
});
