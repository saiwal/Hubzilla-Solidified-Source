/**
 * MentionEmojiPopups.tsx
 * Renders the mention/emoji popup pair driven by a useMentionEmojiWiring()
 * instance — replaces the duplicated <MentionPopup>/<EmojiPopup> JSX block
 * that used to live at the bottom of every composer.
 */

import { Show, type Component } from "solid-js";
import MentionPopup from "./MentionPopup";
import EmojiPopup from "../emoji/EmojiPopup";
import type { MentionEmojiWiring } from "./useMentionEmojiWiring";

export interface MentionEmojiPopupsProps {
  wiring: MentionEmojiWiring;
}

const MentionEmojiPopups: Component<MentionEmojiPopupsProps> = (props) => {
  const { mention, emoji, selectMention, selectEmoji } = props.wiring;

  return (
    <>
      <Show when={mention.open() && mention.rect() !== null}>
        <MentionPopup
          query={mention.query()!}
          entries={mention.filtered()}
          anchorRect={mention.rect()!}
          activeIdx={mention.activeIdx()}
          onSelect={(entry) => selectMention(entry)}
        />
      </Show>

      <Show when={emoji.open() && emoji.rect() !== null}>
        <EmojiPopup
          entries={emoji.filtered()}
          anchorRect={emoji.rect()!}
          activeIdx={emoji.activeIdx()}
          onSelect={(entry) => selectEmoji(entry)}
        />
      </Show>
    </>
  );
};

export default MentionEmojiPopups;
