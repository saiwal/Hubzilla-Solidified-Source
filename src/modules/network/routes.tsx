import { onMount } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { posts, loadNetwork, loading } from "./store";
import StreamList from "../../components/StreamList";
import type { NetworkParams } from "./api";

export default function Network() {
  const [searchParams] = useSearchParams();

  onMount(() => {
    const s = (key: string) => {
      const v = searchParams[key];
      return v ? String(Array.isArray(v) ? v[0] : v) : undefined;
    };

    const params: NetworkParams = {};
    const order = s('order');
    if (order)              params.order  = order as NetworkParams['order'];
    if (s('search'))        params.search = s('search');
    if (s('tag'))           params.tag    = s('tag');
    if (s('cat'))           params.cat    = s('cat');
    if (s('verb'))          params.verb   = s('verb');
    if (s('xchan'))         params.xchan  = s('xchan');
    if (s('net'))           params.net    = s('net');
    if (s('dend'))          params.dend   = s('dend');
    if (s('dbegin'))        params.dbegin = s('dbegin');
    if (s('gid'))           params.gid    = Number(s('gid'));
    if (s('cid'))           params.cid    = Number(s('cid'));
    if (s('cmin'))          params.cmin   = Number(s('cmin'));
    if (s('cmax'))          params.cmax   = Number(s('cmax'));
    if (searchParams.star)  params.star   = 1;
    if (searchParams.conv)  params.conv   = 1;
    if (searchParams.dm)    params.dm     = 1;

    loadNetwork(params);
  });

  return (
    <>
      {loading() && <p>Loading...</p>}
      <StreamList posts={posts()} />
    </>
  );
}
