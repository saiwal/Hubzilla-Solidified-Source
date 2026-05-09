import TagWidget from "@/shared/stream/components/TagWidget";
import CategoryWidget from "@/shared/stream/components/CategoryWidget";
import PopularPostsWidget from "@/shared/stream/components/PopularPostsWidget";
import { usePageNick } from "@/shared/store/site-config";

export function ArticleTagWidget() {
  return <TagWidget channelNick={usePageNick()()} type="articles" />;
}
export function ArticleCategoryWidget() {
  return <CategoryWidget channelNick={usePageNick()()} type="articles" />;
}
export function ArticlePopularWidget() {
  return <PopularPostsWidget channelNick={usePageNick()()} type="articles" />;
}
