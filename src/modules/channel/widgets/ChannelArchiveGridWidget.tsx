import ArchiveGridWidget from "@/shared/stream/components/ArchiveGridWidget";
import { monthRange } from "@/shared/stream/components/ArchiveWidget";
import { usePageNick } from "@/shared/store/site-config";
import { useSearchParams } from "@solidjs/router";

export default function ChannelArchiveGridWidget() {
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
    <ArchiveGridWidget
      channelNick={usePageNick()()}
      type="posts"
      activeDbegin={activeDbegin()}
      activeDend={activeDend()}
      onMonthClick={onMonthClick}
    />
  );
}
