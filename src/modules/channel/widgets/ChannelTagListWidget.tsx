import TagListWidget from "@/shared/stream/components/TagListWidget";
import { usePageNick } from "@/shared/store/site-config";
import { useSearchParams } from "@solidjs/router";

export default function ChannelTagListWidget() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = () => String(searchParams.tag ?? "");

  const onTagClick = (tag: string) => {
    setSearchParams({ tag: activeTag() === tag ? undefined : tag, cat: undefined });
  };

  return (
    <TagListWidget
      channelNick={usePageNick()()}
      type="posts"
      activeTag={activeTag()}
      onTagClick={onTagClick}
    />
  );
}
