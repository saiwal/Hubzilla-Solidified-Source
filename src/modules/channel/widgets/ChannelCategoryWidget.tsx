import CategoryWidget from "@/shared/stream/components/CategoryWidget";
import { usePageNick } from "@/shared/store/site-config";
import { useSearchParams } from "@solidjs/router";

export default function ChannelCategoryWidget() {
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
