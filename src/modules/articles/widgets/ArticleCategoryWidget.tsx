import CategoryWidget from "@/shared/stream/components/CategoryWidget";
import { usePageNick } from "@/shared/store/site-config";
import { activeCategory, setArticleFilter } from "../store";

export default function ArticleCategoryWidget() {
  return (
    <CategoryWidget
      channelNick={usePageNick()()}
      type="articles"
      activeSlug={activeCategory()}
      onCategoryClick={(slug) => setArticleFilter("cat", slug)}
    />
  );
}
