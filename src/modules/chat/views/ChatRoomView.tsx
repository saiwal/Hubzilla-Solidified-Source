// src/modules/chat/views/ChatRoomView.tsx
import {
	createEffect,
	createSignal,
	For,
	Show,
	onCleanup,
	createMemo,
	on,
	untrack,
} from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { usePageNick } from "@/shared/store/site-config";
import {
	messages,
	presence,
	chatLoading,
	sendError,
	viewerHash,
	enterRoom,
	exitRoom,
	sendChatMessage,
} from "../store";
import {
	MdFillArrow_back,
	MdFillSend,
	MdFillPeople,
	MdFillChat,
} from "solid-icons/md";
import formatPostDate from "@/shared/lib/date";

export default function ChatRoomView() {
	const params = useParams<{ nick: string; roomId: string }>();
	const navigate = useNavigate();
	const pageNick = usePageNick();

	const nick = () => params.nick || pageNick();
	const roomId = () => parseInt(params.roomId);

	const [text, setText] = createSignal("");
	const [sending, setSending] = createSignal(false);
	const [showPresence, setShowPresence] = createSignal(false);

	let messagesEl: HTMLDivElement | undefined;
	let inputEl: HTMLTextAreaElement | undefined;

	// Enter room on mount / param change
	createEffect(on([nick, roomId] as const, ([n, r]) => {
		if (n && r) enterRoom(n, r);
	}));

	// Auto-scroll to bottom when new messages arrive
	createEffect(on(messages, () => {
		untrack(() => {
			if (messagesEl)
				requestAnimationFrame(() => { if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight; });
		});
	}));

	// Leave on unmount
	onCleanup(() => {
		const n = nick();
		const r = roomId();
		if (n && r) exitRoom(n, r);
	});

	async function handleSend() {
		const body = text().trim();
		if (!body || sending()) return;

		setSending(true);
		setText("");
		await sendChatMessage(nick(), roomId(), body);
		setSending(false);
		inputEl?.focus();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	const presenceCount = createMemo(() => presence().length);
	const groupedMessages = createMemo(() => {
		const msgs = messages();
		return msgs.map((msg, i) => ({
			...msg,
			isFirst: i === 0 || msgs[i - 1].author_hash !== msg.author_hash,
			isLast:
				i === msgs.length - 1 ||
				msgs[i + 1].author_hash !== msg.author_hash,
		}));
	});

	return (
		<div class="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
			{/* Header */}
			<div class="flex items-center gap-3 px-4 py-3 border-b border-rim bg-surface shrink-0">
				<button
					onClick={() => navigate(`/chat/${nick()}`)}
					class="p-1.5 rounded-lg text-muted hover:bg-elevated hover:text-txt transition-colors"
				>
					<MdFillArrow_back class="text-lg" />
				</button>
				<div class="flex items-center gap-2 flex-1 min-w-0">
					<MdFillChat class="text-accent shrink-0" />
					<span class="font-medium text-txt text-sm truncate">
						{/* Room name from messages or loading */}
						{messages()[0] ? "Chatroom" : chatLoading() ? "Loading…" : "Chatroom"}
					</span>
				</div>
				<button
					onClick={() => setShowPresence((v) => !v)}
					class="flex items-center gap-1.5 text-xs text-muted hover:text-txt border border-rim rounded-lg px-2.5 py-1.5 hover:bg-elevated transition-colors"
				>
					<MdFillPeople class="text-sm" />
					{presenceCount()} online
				</button>
			</div>

			<div class="flex flex-1 min-h-0">
				{/* Messages area */}
				<div class="flex flex-col flex-1 min-w-0">
					{/* Loading skeleton */}
					<Show when={chatLoading()}>
						<div class="flex-1 p-4 space-y-3">
							<For each={[0, 1, 2, 3]}>
								{(_, i) => (
									<div
										class="flex gap-2 animate-pulse"
										classList={{ "flex-row-reverse": i() % 3 === 0 }}
									>
										<div class="w-7 h-7 rounded-full bg-elevated shrink-0" />
										<div class="space-y-1 flex-1 max-w-xs">
											<div class="h-3 bg-elevated rounded w-20" />
											<div class="h-8 bg-elevated rounded-xl" />
										</div>
									</div>
								)}
							</For>
						</div>
					</Show>

					{/* Empty */}
					<Show when={!chatLoading() && messages().length === 0}>
						<div class="flex-1 flex items-center justify-center">
							<div class="text-center space-y-2">
								<MdFillChat class="text-3xl text-muted mx-auto" />
								<p class="text-sm text-muted">No messages yet. Say hello!</p>
							</div>
						</div>
					</Show>

					{/* Message list */}
					<Show when={!chatLoading() && messages().length > 0}>
						<div
							ref={messagesEl}
							class="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 scroll-smooth"
						>
							<For each={groupedMessages()}>
								{(msg) => {
									// Rough self-detection by name match
									const isSelf = () =>
										!!viewerHash() && msg.author_hash === viewerHash();

									return (
										<div
											class="flex gap-2 py-0.5"
											classList={{
												"flex-row-reverse": isSelf(),
												"mt-3": msg.isFirst,
											}}
										>
											{/* Avatar — only show on first of a run */}
											<Show when={msg.isFirst}>
												<div class="w-7 h-7 shrink-0 mt-0.5">
													<Show
														when={msg.author_avatar}
														fallback={
															<div class="w-7 h-7 rounded-full bg-accent-muted flex items-center justify-center text-xs text-accent font-semibold">
																{msg.author_name?.[0]?.toUpperCase() ?? "?"}
															</div>
														}
													>
														<img
															src={msg.author_avatar}
															alt={msg.author_name}
															class="w-7 h-7 rounded-full object-cover"
														/>
													</Show>
												</div>
											</Show>
											<Show when={!msg.isFirst}>
												<div class="w-7 shrink-0" />
											</Show>

											{/* Bubble */}
											<div
												class="max-w-[72%] space-y-0.5"
												classList={{ "items-end flex flex-col": isSelf() }}
											>
												<Show when={msg.isFirst}>
													<p
														class="text-[11px] text-subtle px-1"
														classList={{ "text-right": isSelf() }}
													>
														{msg.author_name}
													</p>
												</Show>
												<div
													class="px-3 py-2 text-sm leading-relaxed rounded-2xl"
													classList={{
														"bg-accent text-accent-txt rounded-tr-sm": isSelf(),
														"bg-elevated text-txt rounded-tl-sm": !isSelf(),
														"rounded-tr-2xl": isSelf() && !msg.isFirst,
														"rounded-tl-2xl": !isSelf() && !msg.isFirst,
													}}
												>
													{msg.body}
												</div>
												<Show when={msg.isLast}>
													<p
														class="text-[10px] text-subtle px-1"
														title={new Date(msg.created.replace(" ", "T") + "Z").toLocaleString()}
													>
														{formatPostDate(msg.created)}
													</p>
												</Show>
											</div>
										</div>
									);
								}}
							</For>
						</div>
					</Show>

					{/* Send error */}
					<Show when={sendError()}>
						<p class="text-xs text-red-500 px-4 py-1">{sendError()}</p>
					</Show>

					{/* Input bar */}
					<div class="px-4 py-3 border-t border-rim bg-surface shrink-0">
						<div class="flex gap-2 items-end">
							<textarea
								ref={inputEl}
								value={text()}
								onInput={(e) => setText(e.currentTarget.value)}
								onKeyDown={handleKey}
								placeholder="Write a message… (Enter to send)"
								rows={1}
								class="flex-1 bg-surface border border-rim text-txt text-sm rounded-xl px-3 py-2 resize-none hover:border-rim-strong focus:outline-none focus:border-accent transition-colors leading-relaxed"
								style={{ "max-height": "7rem", "overflow-y": "auto" }}
							/>
							<button
								onClick={handleSend}
								disabled={!text().trim() || sending()}
								class="p-2.5 rounded-xl bg-accent text-accent-txt hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
							>
								<MdFillSend class="text-base" />
							</button>
						</div>
					</div>
				</div>

				{/* Presence sidebar */}
				<Show when={showPresence()}>
					<div class="w-48 border-l border-rim bg-surface flex flex-col shrink-0">
						<p class="text-xs font-medium text-muted px-3 py-2 border-b border-rim">
							{presenceCount()} online
						</p>
						<div class="overflow-y-auto flex-1 px-2 py-2 space-y-1">
							<For each={presence()}>
								{(member) => (
									<div class="flex items-center gap-2 py-1">
										<div class="relative shrink-0">
											<Show
												when={member.avatar}
												fallback={
													<div class="w-6 h-6 rounded-full bg-accent-muted flex items-center justify-center text-[10px] text-accent font-semibold">
														{member.name?.[0]?.toUpperCase() ?? "?"}
													</div>
												}
											>
												<img
													src={member.avatar}
													alt={member.name}
													class="w-6 h-6 rounded-full object-cover"
												/>
											</Show>
											<span
												class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-surface"
												classList={{
													"bg-green-500": member.status === "online",
													"bg-yellow-500": member.status !== "online",
												}}
											/>
										</div>
										<span class="text-xs text-txt truncate">{member.name}</span>
									</div>
								)}
							</For>
						</div>
					</div>
				</Show>
			</div>
		</div>
	);
}
