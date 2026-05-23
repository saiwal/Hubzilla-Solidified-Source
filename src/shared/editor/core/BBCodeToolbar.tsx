interface Props {
  /** Reference to the source textarea (Source tab) */
  textareaRef: () => HTMLTextAreaElement | undefined;
  /** Reference to the WYSIWYG div (Write tab) */
  editorRef: () => HTMLDivElement | undefined;
  /** Which tab is currently active */
  tab: "wysiwyg" | "source" | "preview";
  /** Called when a BBCode snippet is inserted via the source textarea path */
  onSourceChange: (v: string) => void;
}

export default function BBCodeToolbar(props: Props) {
  /**
   * Wraps the current selection in the source textarea with opening/closing tags.
   * Falls back to appending at cursor position if nothing is selected.
   */
  const wrapSource = (open: string, close: string) => {
    const ta = props.textareaRef();
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end, value } = ta;
    const selected = value.slice(start, end);
    const replacement = `${open}${selected}${close}`;
    const next = value.slice(0, start) + replacement + value.slice(end);
    props.onSourceChange(next);
    // Restore selection around inserted content
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + open.length, start + open.length + selected.length);
    });
  };

  // Add buttons here — call wrapSource("[tag]", "[/tag]") for each.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void wrapSource; // referenced by future buttons
  return (
    <div class="flex flex-wrap items-center gap-0.5 px-2 py-1 bg-surface border-b border-rim border-dashed">
      <span class="text-xs text-muted mr-1 select-none">BBCode</span>
      {/* ── Add buttons below ── */}
    </div>
  );
}
