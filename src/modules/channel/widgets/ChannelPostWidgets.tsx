import TagWidget from "@/shared/stream/components/TagWidget";
import CategoryWidget from "@/shared/stream/components/CategoryWidget";
import PopularPostsWidget from "@/shared/stream/components/PopularPostsWidget";
import ArchiveWidget, { monthRange } from "@/shared/stream/components/ArchiveWidget";
import { usePageNick } from "@/shared/store/site-config";
import { useSearchParams } from "@solidjs/router";

export function ChannelTagWidget() {
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

export function ChannelCategoryWidget() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSlug = () => String(searchParams.cat ?? "");

  const onCategoryClick = (slug: string) => {
    setSearchParams({ cat: activeSlug() === slug ? undefined : slug, tag: undefined });
  };

  return (
    <CategoryWidget
      channelNick={usePageNick()()}
      type="posts"
      activeSlug={activeSlug()}
      onCategoryClick={onCategoryClick}
    />
  );
}

export function ChannelPopularWidget() {
  return <PopularPostsWidget channelNick={usePageNick()()} type="posts" />;
}

export function ChannelArchiveWidget() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeDbegin = () => String(searchParams.dbegin ?? "");
  const activeDend   = () => String(searchParams.dend   ?? "");

  const onMonthClick = (year: number, month: number) => {
    const [dbegin, dend] = monthRange(year, month);
    const isActive = activeDbegin() === dbegin && activeDend() === dend;
    if (isActive) {
      setSearchParams({ dbegin: undefined, dend: undefined });
    } else {
      setSearchParams({ dbegin, dend, tag: undefined, cat: undefined });
    }
  };

  return (
    <ArchiveWidget
      channelNick={usePageNick()()}
      type="posts"
      activeDbegin={activeDbegin()}
      activeDend={activeDend()}
      onMonthClick={onMonthClick}
    />
  );
}
