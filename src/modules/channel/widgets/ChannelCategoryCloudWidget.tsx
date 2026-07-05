import CategoryCloudWidget from "@/shared/stream/components/CategoryCloudWidget";
import { usePageNick } from "@/shared/store/site-config";
import { useSearchParams } from "@solidjs/router";

export default function ChannelCategoryCloudWidget() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSlug = () => String(searchParams.cat ?? "");

  const onCategoryClick = (slug: string) => {
    setSearchParams({ cat: activeSlug() === slug ? undefined : slug, tag: undefined });
  };

  return (
    <CategoryCloudWidget
      channelNick={usePageNick()()}
      type="posts"
      activeSlug={activeSlug()}
      onCategoryClick={onCategoryClick}
    />
  );
}
