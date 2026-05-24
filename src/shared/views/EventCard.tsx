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
		<div class="my-3 flex gap-3 rounded-xl border border-accent/30
								bg-accent-muted/30 p-4 text-sm">
			{/* Calendar icon column */}
			<div class="shrink-0 flex flex-col items-center justify-start w-12">
				<div class="w-12 rounded-lg overflow-hidden border border-accent/40 text-center">
					<div class="bg-accent text-accent-fg text-[10px] font-semibold uppercase py-0.5 tracking-wide">
						{new Date(e.start.replace(" ", "T") + "Z")
							.toLocaleString("default", { month: "short" })}
					</div>
					<div class="bg-elevated text-txt text-xl font-bold leading-tight py-1">
						{new Date(e.start.replace(" ", "T") + "Z").getUTCDate()}
					</div>
				</div>
			</div>

			{/* Content */}
			<div class="flex-1 min-w-0">
				<p class="font-semibold text-txt leading-snug">
					{e.summary}
				</p>
				<p class="mt-1 text-accent text-xs">
					{startFmt()}
					<Show when={multiDay()}>
						{" "}&ndash;{" "}{finishFmt()}
					</Show>
				</p>
				<Show when={e.description}>
					<p class="mt-1.5 text-muted text-xs leading-relaxed"
						 innerHTML={e.description} />
				</Show>
			</div>
		</div>
	);
}
