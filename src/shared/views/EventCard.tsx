// shared/views/EventCard.tsx
import { Show } from "solid-js";
import type { EventData } from "../lib/parseEventBBCode";
import { formatEventDate } from "../lib/parseEventBBCode";

export default function EventCard(props: { event: EventData }) {
	const e = props.event;
	const startFmt  = () => formatEventDate(e.start);
	const finishFmt = () => formatEventDate(e.finish);
	const multiDay  = () => e.finish && e.finish !== e.start;

	return (
		<div class="my-3 flex gap-3 rounded-xl border border-blue-200 dark:border-blue-800
								bg-blue-50 dark:bg-blue-950/40 p-4 text-sm">
			{/* Calendar icon column */}
			<div class="shrink-0 flex flex-col items-center justify-start w-12">
				<div class="w-12 rounded-lg overflow-hidden border border-blue-300 dark:border-blue-700 text-center">
					<div class="bg-blue-600 text-white text-[10px] font-semibold uppercase py-0.5 tracking-wide">
						{new Date(e.start.replace(" ", "T") + "Z")
							.toLocaleString("default", { month: "short" })}
					</div>
					<div class="text-blue-900 dark:text-blue-100 text-xl font-bold leading-tight py-1">
						{new Date(e.start.replace(" ", "T") + "Z").getUTCDate()}
					</div>
				</div>
			</div>

			{/* Content */}
			<div class="flex-1 min-w-0">
				<p class="font-semibold text-blue-900 dark:text-blue-100 leading-snug">
					{e.summary}
				</p>
				<p class="mt-1 text-blue-700 dark:text-blue-300 text-xs">
					{startFmt()}
					<Show when={multiDay()}>
						{" "}&ndash;{" "}{finishFmt()}
					</Show>
				</p>
				<Show when={e.description}>
					<p class="mt-1.5 text-gray-700 dark:text-gray-300 text-xs leading-relaxed"
						 innerHTML={e.description} />
				</Show>
			</div>
		</div>
	);
}
