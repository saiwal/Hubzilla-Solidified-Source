import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

const popularLoader = () =>
  import("./widgets/ArticleWidgets").then((m) => ({
    default: m.ArticlePopularWidget,
  }));
const categoryLoader = () =>
  import("./widgets/ArticleWidgets").then((m) => ({
    default: m.ArticleCategoryWidget,
  }));
const tagLoader = () =>
  import("./widgets/ArticleWidgets").then((m) => ({
    default: m.ArticleTagWidget,
  }));

registerModule({
  id: "articles",
  routes: [
    { path: "/articles", component: () => import("./views/ArticlesView") },
    {
      path: "/articles/:nick",
      component: () => import("./views/ArticlesView"),
    },
    {
      path: "/articles/:nick/:uuid",
      component: () => import("./views/ArticleView"),
    },
  ],
  navItem: {
    label: () => useI18n().t("nav.articles"),
    icon: "article",
    path: "/articles",
    href: () => `/articles/${usePageNick()()}`,
    context: "all",
    hidden: false,
  },
  slots: {
    right: [popularLoader, categoryLoader, tagLoader],
  },
  permissions: [],
});
