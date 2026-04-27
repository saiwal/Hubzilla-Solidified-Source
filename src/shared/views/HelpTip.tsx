import { createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";

interface Props {
  text: string;
}

export default function HelpTip(props: Props) {
  const [pos, setPos] = createSignal<{ top: number; left: number } | null>(null);
  let ref!: HTMLSpanElement;

  const show = () => {
    const r = ref.getBoundingClientRect();
    setPos({
      top: r.top + window.scrollY - 8,
      left: r.left + r.width / 2,
    });
  };

  const hide = () => setPos(null);

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
        class="inline-flex items-center justify-center w-4 h-4 rounded-full
               bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600
               cursor-default flex-shrink-0"
      >
        <span class="text-[10px] font-medium text-muted select-none leading-none">
          ?
        </span>
      </span>

      <Show when={pos()}>
        <Portal>
          <div
            class="fixed z-[9999] -translate-x-1/2 -translate-y-full w-48
                   bg-surface border border-rim
                   rounded-lg px-2.5 py-2 text-xs text-muted
                   leading-relaxed pointer-events-none"
            style={{ top: `${pos()!.top}px`, left: `${pos()!.left}px` }}
          >
            {props.text}
          </div>
        </Portal>
      </Show>
    </>
  );
}
