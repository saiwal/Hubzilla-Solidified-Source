import Tooltip from "./Tooltip";

interface Props {
  text: string;
}

export default function HelpTip(props: Props) {
  return (
    <Tooltip content={props.text} placement="top">
      <span
        tabIndex={0}
        class="inline-flex items-center justify-center w-4 h-4 rounded-full
               bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600
               cursor-default flex-shrink-0"
      >
        <span class="text-[10px] font-medium text-muted select-none leading-none">
          ?
        </span>
      </span>
    </Tooltip>
  );
}
