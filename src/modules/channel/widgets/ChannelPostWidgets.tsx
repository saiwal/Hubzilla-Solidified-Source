import TagWidget from "@/shared/stream/components/TagWidget";
import CategoryWidget from "@/shared/stream/components/CategoryWidget";
import PopularPostsWidget from "@/shared/stream/components/PopularPostsWidget";
import { usePageNick } from "@/shared/store/site-config";

export function ChannelTagWidget() {
  return <TagWidget channelNick={usePageNick()()} type="posts" />;
}
export function ChannelCategoryWidget() {
  return <CategoryWidget channelNick={usePageNick()()} type="posts" />;
}
export function ChannelPopularWidget() {
  return <PopularPostsWidget channelNick={usePageNick()()} type="posts" />;
}
