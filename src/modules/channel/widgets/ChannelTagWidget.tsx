import TagWidget from "@/shared/stream/components/TagWidget";
import { usePageNick } from "@/shared/store/site-config";
import { useSearchParams } from "@solidjs/router";

export default function ChannelTagWidget() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = () => String(searchParams.tag ?? "");

  const onTagClick = (tag: string) => {
    setSearchParams({ tag: activeTag() === tag ? undefined : tag, cat: undefined });
  };

  return (
    <TagWidget
      channelNick={usePageNick()()}
      type="posts"
      activeTag={activeTag()}
      onTagClick={onTagClick}
    />
  );
}
