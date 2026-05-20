import TagWidget from "@/shared/stream/components/TagWidget";
import CategoryWidget from "@/shared/stream/components/CategoryWidget";
import PopularPostsWidget from "@/shared/stream/components/PopularPostsWidget";
import { usePageNick } from "@/shared/store/site-config";
import { activeCategory, activeTag, setArticleFilter } from "../store";

export function ArticleTagWidget() {
  return (
    <TagWidget
      channelNick={usePageNick()()}
      type="articles"
      activeTag={activeTag()}
      onTagClick={(tag) => setArticleFilter("tag", tag)}
    />
  );
}
export function ArticleCategoryWidget() {
  return (
    <CategoryWidget
      channelNick={usePageNick()()}
      type="articles"
      activeSlug={activeCategory()}
      onCategoryClick={(slug) => setArticleFilter("cat", slug)}
    />
  );
}
export function ArticlePopularWidget() {
  return <PopularPostsWidget channelNick={usePageNick()()} type="articles" />;
}
