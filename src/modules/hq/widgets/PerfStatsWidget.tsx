import { isAdmin } from "@/shared/store/auth-store";
import { createSignal, onCleanup, onMount, For, Show } from "solid-js";

interface PerfStats {
  loadavg: [number, number, number];
  dbqueries: number;
  outqueue: number;
  queueworkers: number;
  workqsz: number;
  ts: number;
}

const POLL_INTERVAL = 5000;
const ENDPOINT = "/perfstats";
const MAX_POINTS = 30;

interface TimePoint {
  ts: number;
  la1: number;
  la5: number;
  la15: number;
  dbRate: number | null;
  outqueue: number;
  queueworkers: number;
  workqsz: number;
}

export default function PerfStatsPanel() {
	if (!isAdmin()) return;
  const [points, setPoints] = createSignal<TimePoint[]>([]);
  const [latest, setLatest] = createSignal<PerfStats | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [age, setAge] = createSignal(0);

  let lastFetch = 0;
  let lastTs = 0;
  let lastQ = 0;

  async function fetchStats() {
    try {
      const res = await fetch(ENDPOINT, {
        credentials: "include",
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PerfStats = await res.json();

      let rate: number | null = null;
      if (lastTs !== 0) {
        const dt = data.ts - lastTs;
        const dq = data.dbqueries - lastQ;
        if (dt > 0) rate = Math.round(dq / dt);
      }
      lastTs = data.ts;
      lastQ = data.dbqueries;

      const pt: TimePoint = {
        ts: data.ts,
        la1: data.loadavg[0],
        la5: data.loadavg[1],
        la15: data.loadavg[2],
        dbRate: rate,
        outqueue: data.outqueue,
        queueworkers: data.queueworkers,
        workqsz: data.workqsz,
      };

      setPoints((prev) => [...prev.slice(-(MAX_POINTS - 1)), pt]);
      setLatest(data);
      setError(null);
      lastFetch = Date.now();
      setAge(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    }
  }

  onMount(() => {
    fetchStats();
    const poll = setInterval(fetchStats, POLL_INTERVAL);
    const tick = setInterval(() => setAge(Math.round((Date.now() - lastFetch) / 1000)), 1000);
    onCleanup(() => { clearInterval(poll); clearInterval(tick); });
  });

  // SVG sparkline from an array of numbers
  function Sparkline(props: { data: number[]; color: string; height?: number }) {
    const h = props.height ?? 40;
    const w = 200;
    const pad = 3;

    const path = () => {
      const vals = props.data;
      if (vals.length < 2) return "";
      const max = Math.max(...vals, 0.01);
      const min = Math.min(...vals);
      const range = max - min || 1;
      const step = (w - pad * 2) / (vals.length - 1);
      const pts = vals.map((v, i) => {
        const x = pad + i * step;
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return `M${pts.join("L")}`;
    };

    const area = () => {
      const vals = props.data;
      if (vals.length < 2) return "";
      const max = Math.max(...vals, 0.01);
      const min = Math.min(...vals);
      const range = max - min || 1;
      const step = (w - pad * 2) / (vals.length - 1);
      const pts = vals.map((v, i) => {
        const x = pad + i * step;
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      const last = vals.length - 1;
      const lastX = (pad + last * step).toFixed(1);
      return `M${pad},${h - pad} L${pts.join("L")} L${lastX},${h - pad}Z`;
    };

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: `${h}px`, display: "block" }}>
        <path d={area()} fill={props.color} opacity="0.12" />
        <path d={path()} fill="none" stroke={props.color} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    );
  }

  return (
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Server Performance
        </p>
        <Show when={latest() && !error()}>
          <span class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {age() < 3 ? "live" : `${age()}s ago`}
          </span>
        </Show>
      </div>

      <Show when={error()}>
        <p class="text-sm text-red-400 py-4 text-center">⚠ {error()}</p>
      </Show>

      <Show when={!latest() && !error()}>
        <div class="animate-pulse grid grid-cols-2 sm:grid-cols-3 gap-3">
          <For each={[1,2,3,4,5,6]}>{() =>
            <div class="h-20 rounded-lg bg-gray-100 dark:bg-gray-700" />
          }</For>
        </div>
      </Show>

      <Show when={latest()} keyed>
        {(s) => {
          const pts = points();
          const lastPt = pts[pts.length - 1];

          const graphs: Array<{
            label: string;
            value: string;
            color: string;
            data: number[];
          }> = [
            {
              label: "Load 1m",
              value: s.loadavg[0].toFixed(2),
              color: "#60a5fa",
              data: pts.map((p) => p.la1),
            },
            {
              label: "Load 5m",
              value: s.loadavg[1].toFixed(2),
              color: "#34d399",
              data: pts.map((p) => p.la5),
            },
            {
              label: "Load 15m",
              value: s.loadavg[2].toFixed(2),
              color: "#a78bfa",
              data: pts.map((p) => p.la15),
            },
            {
              label: "DB queries/s",
              value: lastPt?.dbRate != null ? String(lastPt.dbRate) : "—",
              color: "#f59e0b",
              data: pts.filter((p) => p.dbRate != null).map((p) => p.dbRate as number),
            },
            {
              label: "Out queue",
              value: String(s.outqueue),
              color: "#f87171",
              data: pts.map((p) => p.outqueue),
            },
            {
              label: "Work queue",
              value: String(s.workqsz),
              color: "#fb923c",
              data: pts.map((p) => p.workqsz),
            },
          ];

          return (
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <For each={graphs}>
                {(g) => (
                  <div class="rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 px-4 pt-3 pb-2 flex flex-col gap-1">
                    <div class="flex items-baseline justify-between">
                      <p class="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {g.label}
                      </p>
                      <p class="text-lg font-semibold font-mono text-gray-800 dark:text-gray-100">
                        {g.value}
                      </p>
                    </div>
                    <Show when={g.data.length > 1} fallback={
                      <div class="h-10 flex items-center justify-center text-xs text-gray-300 dark:text-gray-600">
                        collecting…
                      </div>
                    }>
                      <Sparkline data={g.data} color={g.color} height={40} />
                    </Show>
                  </div>
                )}
              </For>
            </div>
          );
        }}
      </Show>
    </div>
  );
}

