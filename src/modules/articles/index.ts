import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

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
  widgets: [
    {
      id: "articles.drafts",
      label: () => useI18n().t("widgets.article_drafts"),
      loader: () => import("./widgets/ArticleDraftsWidget"),
      slot: "right",
      visitorVisible: false,
    },
    {
      id: "articles.popular",
      label: () => useI18n().t("widgets.popular_articles"),
      loader: () => import("./widgets/ArticlePopularWidget"),
      slot: "right",
    },
    {
      id: "articles.categories",
      label: () => useI18n().t("widgets.article_categories"),
      loader: () => import("./widgets/ArticleCategoryWidget"),
      slot: "right",
    },
    {
      id: "articles.tags",
      label: () => useI18n().t("widgets.article_tags"),
      loader: () => import("./widgets/ArticleTagWidget"),
      slot: "right",
    },
  ],
  permissions: [],
  appName: "Articles",
});
