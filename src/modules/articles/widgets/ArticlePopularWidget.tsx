import PopularPostsWidget from "@/shared/stream/components/PopularPostsWidget";
import { usePageNick } from "@/shared/store/site-config";

export default function ArticlePopularWidget() {
  return <PopularPostsWidget channelNick={usePageNick()()} type="articles" />;
}
