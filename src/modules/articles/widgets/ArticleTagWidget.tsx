import TagWidget from "@/shared/stream/components/TagWidget";
import { usePageNick } from "@/shared/store/site-config";
import { activeTag, setArticleFilter } from "../store";

export default function ArticleTagWidget() {
  return (
    <TagWidget
      channelNick={usePageNick()()}
      type="articles"
      activeTag={activeTag()}
      onTagClick={(tag) => setArticleFilter("tag", tag)}
    />
  );
}
