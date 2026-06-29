// src/modules/chat/ChatComposer.tsx
import { createSignal, createEffect, Show, onCleanup, lazy } from "solid-js";
import { createComposerStore } from "@/shared/editor/store/createComposerStore";
import RichEditor from "@/shared/editor/core/RichEditor";
import { CAPABILITIES } from "@/shared/editor/types/editor.types";
import { useI18n } from "@/i18n";
import {
  useMention,
  getWysiwygMentionQuery,
  getCaretRect,
} from "@/shared/editor/mention/useMention";
import MentionPopup from "@/shared/editor/mention/MentionPopup";
import {
  useEmoji,
  getWysiwygEmojiQuery,
} from "@/shared/editor/emoji/useEmoji";
import EmojiPopup from "@/shared/editor/emoji/EmojiPopup";
import { sendChatMessage, roomName, roomAcl } from "./store";
import { currentNick } from "@/shared/store/auth-store";
import { uploadChatMedia } from "./chatAttach";
import {
  MdFillSend,
  MdOutlineEmoji_emotions,
  MdOutlineImage,
  MdOutlineVideocam,
  MdOutlineMic,
  MdOutlineCamera_alt,
} from "solid-icons/md";

const CameraCapture = lazy(() => import("@/shared/editor/attachments/CameraCapture"));

interface Props {
  nick: string;
  roomId: number;
}

export default function ChatComposer(props: Props) {
  const { t } = useI18n();
  const [tab, setTab] = createSignal<"wysiwyg" | "source" | "preview">("wysiwyg");
  const [uploading, setUploading] = createSignal(false);
  const [uploadPct, setUploadPct] = createSignal(0);
  const [cameraOpen, setCameraOpen] = createSignal(false);

  const store = createComposerStore(
    async (body) => {
      await sendChatMessage(props.nick, props.roomId, body);
    },
    `chat:${props.nick}:${props.roomId}`,
  );

  const mention = useMention();
  const emoji = useEmoji();
  let wrapperRef: HTMLDivElement | undefined;
  let imgInput: HTMLInputElement | undefined;
  let videoInput: HTMLInputElement | undefined;
  let audioInput: HTMLInputElement | undefined;

  function getEditor(): HTMLDivElement | null {
    return wrapperRef?.querySelector("[contenteditable]") ?? null;
  }

  // Drive mention/emoji popups from body changes
  createEffect(() => {
    void store.body();
    const editor = getEditor();
    if (!editor) return;
    const mq = getWysiwygMentionQuery();
    if (mq !== null) { const r = getCaretRect(); if (r) { mention.openWithQuery(mq, r); emoji.close(); return; } }
    const eq = getWysiwygEmojiQuery();
    if (eq !== null) { const r = getCaretRect(); if (r) { emoji.openWithQuery(eq, r); mention.close(); return; } }
    mention.close();
    emoji.close();
  });

  function onKeyDown(e: KeyboardEvent) {
    if (mention.open()) {
      const consumed = mention.onKeyDown(e);
      if (consumed) {
        if (e.key === "Enter" || e.key === "Tab") {
          const entry = mention.filtered()[mention.activeIdx()];
          if (!entry) return;
          const editor = getEditor();
          if (editor) mention.insertWysiwyg(entry, () => store.setBody(editor.innerHTML));
        }
        return;
      }
    }
    if (emoji.open()) {
      const consumed = emoji.onKeyDown(e);
      if (consumed) {
        if (e.key === "Enter" || e.key === "Tab") {
          const entry = emoji.filtered()[emoji.activeIdx()];
          if (!entry) return;
          const editor = getEditor();
          if (editor) emoji.insertWysiwyg(entry, () => store.setBody(editor.innerHTML));
        }
        return;
      }
    }
  }

  window.addEventListener("keydown", onKeyDown);
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  function toggleEmoji() {
    if (emoji.open()) { emoji.close(); return; }
    const r = wrapperRef?.getBoundingClientRect();
    if (r) emoji.openWithQuery("", r);
  }

  async function handleMediaFile(file: File) {
    const nick = currentNick();
    const room = roomName();
    if (!nick || !room) return;

    setUploading(true);
    setUploadPct(0);
    try {
      const media = await uploadChatMedia(nick, room, file, setUploadPct, roomAcl());
      // Append BBCode to the body; RichEditor effect will re-render the WYSIWYG surface
      store.setBody(store.body() ? `${store.body()}\n${media.bbcode}` : media.bbcode);
    } catch (e: any) {
      console.error("Chat media upload failed:", e);
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  }

  function pickFile(input: HTMLInputElement | undefined) {
    input?.click();
  }

  function onFileChange(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (file) void handleMediaFile(file);
    (e.currentTarget as HTMLInputElement).value = "";
  }

  return (
    <div class="px-4 py-3 border-t border-rim bg-surface shrink-0">
      {/* Hidden file inputs */}
      <input ref={imgInput}   type="file" accept="image/*"   class="hidden" onChange={onFileChange} />
      <input ref={videoInput} type="file" accept="video/*"   class="hidden" onChange={onFileChange} />
      <input ref={audioInput} type="file" accept="audio/*"   class="hidden" onChange={onFileChange} />

      <div ref={wrapperRef}>
        <RichEditor
          body={store.body()}
          onInput={store.setBody}
          capabilities={CAPABILITIES.chat}
          tab={tab()}
          onTabChange={setTab}
          onEnter={() => {
            if (mention.open() || emoji.open()) return false;
            store.submit();
            return true;
          }}
          onCtrlEnter={() => {
            if (!mention.open() && !emoji.open()) store.submit();
          }}
          placeholder={t("chat.write_message") as string}
          minHeight="60px"
        />
      </div>

      <Show when={store.error()}>
        <p class="text-xs text-red-500 mt-1">{store.error()}</p>
      </Show>

      <div class="flex items-center justify-between mt-2 gap-2">
        {/* Left: media + emoji buttons */}
        <div class="flex items-center gap-0.5">
          <MediaBtn title="Image" onClick={() => pickFile(imgInput)} disabled={uploading()}>
            <MdOutlineImage class="text-lg" />
          </MediaBtn>
          <MediaBtn title="Video" onClick={() => pickFile(videoInput)} disabled={uploading()}>
            <MdOutlineVideocam class="text-lg" />
          </MediaBtn>
          <MediaBtn title="Audio" onClick={() => pickFile(audioInput)} disabled={uploading()}>
            <MdOutlineMic class="text-lg" />
          </MediaBtn>
          <MediaBtn title="Camera" onClick={() => setCameraOpen(true)} disabled={uploading()}>
            <MdOutlineCamera_alt class="text-lg" />
          </MediaBtn>
          <MediaBtn title="Emoji" onClick={toggleEmoji} disabled={false}>
            <MdOutlineEmoji_emotions class="text-lg" />
          </MediaBtn>

          {/* Upload progress */}
          <Show when={uploading()}>
            <div class="flex items-center gap-1.5 ml-2">
              <div class="w-20 h-1.5 bg-elevated rounded-full overflow-hidden">
                <div
                  class="h-full bg-accent rounded-full transition-all duration-150"
                  style={{ width: `${uploadPct()}%` }}
                />
              </div>
              <span class="text-[10px] text-muted tabular-nums">{uploadPct()}%</span>
            </div>
          </Show>
        </div>

        {/* Right: send button */}
        <button
          type="button"
          onClick={() => store.submit()}
          disabled={store.submitting() || (!store.body().trim() && !uploading())}
          class="p-2 rounded-lg bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
        >
          <MdFillSend class="text-base" />
        </button>
      </div>

      <Show when={mention.open() && mention.rect() !== null}>
        <MentionPopup
          query={mention.query()!}
          entries={mention.filtered()}
          anchorRect={mention.rect()!}
          activeIdx={mention.activeIdx()}
          onSelect={(entry) => {
            const editor = getEditor();
            if (editor) mention.insertWysiwyg(entry, () => store.setBody(editor.innerHTML));
          }}
        />
      </Show>

      <Show when={emoji.open() && emoji.rect() !== null}>
        <EmojiPopup
          entries={emoji.filtered()}
          anchorRect={emoji.rect()!}
          activeIdx={emoji.activeIdx()}
          onSelect={(entry) => {
            const editor = getEditor();
            if (editor) { emoji.insertWysiwyg(entry, () => store.setBody(editor.innerHTML)); emoji.close(); }
          }}
        />
      </Show>

      <Show when={cameraOpen()}>
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(files) => {
            setCameraOpen(false);
            if (files[0]) void handleMediaFile(files[0]);
          }}
        />
      </Show>
    </div>
  );
}

function MediaBtn(props: {
  title: string;
  onClick: () => void;
  disabled: boolean;
  children: any;
}) {
  return (
    <button
      type="button"
      title={props.title}
      onClick={props.onClick}
      disabled={props.disabled}
      class="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-elevated transition-colors disabled:opacity-40"
    >
      {props.children}
    </button>
  );
}
