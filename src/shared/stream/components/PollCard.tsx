// src/shared/stream/components/PollCard.tsx
import { createSignal, For, Show } from "solid-js";
import { useAuth } from "@/shared/store/auth-store";
import { apiVotePoll } from "@/shared/lib/item-api";
import type { PollData } from "@/shared/types/post.types";

function formatEndTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function isPollClosed(poll: PollData): boolean {
  if (poll.closed) {
    try {
      return new Date(poll.closed) < new Date();
    } catch {
      return true;
    }
  }
  if (poll.end_time) {
    try {
      return new Date(poll.end_time) < new Date();
    } catch {
      return false;
    }
  }
  return false;
}

export default function PollCard(props: {
  uuid: string;
  poll: PollData;
  onVoted?: (votes: string[]) => void;
}) {
  const auth = useAuth();

  const closed   = () => isPollClosed(props.poll);
  const hasVoted = () => props.poll.viewer_votes.length > 0;
  const showResults = () => hasVoted() || closed();

  const totalVotes = () =>
    props.poll.options.reduce((sum, o) => sum + o.votes, 0);

  const [selected, setSelected] = createSignal<string[]>(
    props.poll.viewer_votes.length > 0 ? [...props.poll.viewer_votes] : []
  );
  const [submitting, setSubmitting] = createSignal(false);
  const [voted, setVoted] = createSignal(hasVoted());
  const [error, setError] = createSignal<string | null>(null);

  function toggleOption(name: string) {
    if (voted() || closed()) return;
    if (props.poll.multiple) {
      setSelected(prev =>
        prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
      );
    } else {
      setSelected([name]);
    }
  }

  async function submit() {
    const sel = selected();
    if (!sel.length || submitting()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiVotePoll(props.uuid, props.poll.multiple ? sel : sel[0]);
      setVoted(true);
      props.onVoted?.(sel);
    } catch (e: any) {
      setError(e?.message ?? "Vote failed");
    } finally {
      setSubmitting(false);
    }
  }

  const canVote = () =>
    auth()?.isLocal === true && !voted() && !closed();

  const currentVotes = () =>
    voted() && !hasVoted()
      ? props.poll.options.map(o => ({
          ...o,
          votes: selected().includes(o.name) ? o.votes + 1 : o.votes,
        }))
      : props.poll.options;

  const currentTotal = () =>
    currentVotes().reduce((sum, o) => sum + o.votes, 0);

  return (
    <div class="mt-3 rounded-lg border border-rim bg-surface p-3 space-y-2 text-sm">
      <For each={props.poll.options}>
        {(option) => {
          const isSelected  = () => selected().includes(option.name);
          const isVotedFor  = () => props.poll.viewer_votes.includes(option.name);
          const votes       = () => showResults()
            ? (currentVotes().find(o => o.name === option.name)?.votes ?? option.votes)
            : 0;
          const pct         = () => {
            const t = currentTotal();
            return t > 0 ? Math.round((votes() / t) * 100) : 0;
          };

          return (
            <button
              type="button"
              disabled={!canVote()}
              onClick={() => toggleOption(option.name)}
              class={`w-full text-left rounded-md border px-3 py-2 relative overflow-hidden transition-colors
                ${canVote()
                  ? isSelected()
                    ? "border-accent bg-accent/10"
                    : "border-rim hover:border-accent/60 hover:bg-elevated cursor-pointer"
                  : "cursor-default border-rim"}`}
            >
              <Show when={showResults()}>
                <div
                  class="absolute inset-y-0 left-0 bg-accent/15 transition-all duration-500"
                  style={{ width: `${pct()}%` }}
                />
              </Show>
              <div class="relative flex items-center justify-between gap-2">
                <span class={`truncate ${isVotedFor() ? "font-semibold text-accent" : "text-txt"}`}>
                  {option.name}
                </span>
                <Show when={showResults()}>
                  <span class="shrink-0 text-muted text-xs tabular-nums">
                    {pct()}% · {votes()}
                  </span>
                </Show>
              </div>
            </button>
          );
        }}
      </For>

      <div class="flex items-center justify-between gap-3 pt-1">
        <span class="text-xs text-muted">
          {totalVotes()} {totalVotes() === 1 ? "vote" : "votes"}
          <Show when={closed()}>
            <span class="ml-1">· closed</span>
          </Show>
          <Show when={props.poll.end_time && !closed()}>
            <span class="ml-1">· ends {formatEndTime(props.poll.end_time!)}</span>
          </Show>
        </span>

        <Show when={canVote()}>
          <button
            type="button"
            disabled={selected().length === 0 || submitting()}
            onClick={submit}
            class="shrink-0 rounded-md px-3 py-1 text-xs font-medium bg-accent text-accent-fg
                   hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {submitting() ? "Voting…" : "Vote"}
          </button>
        </Show>
      </div>

      <Show when={error()}>
        <p class="text-xs text-red-500">{error()}</p>
      </Show>
    </div>
  );
}
