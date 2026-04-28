// src/shared/editor/composers/CommentComposer.tsx
// export default function CommentComposer(props: {
//   parentMid: string;
//   parentIid: number;
//   profileUid: number;
//   onSubmitted?: () => void;
// }) {
//   const caps = CAPABILITIES.comment;
//   const store = createComposerStore(
//     async (body) => {
//       await postComment({ body, parent_iid: props.parentIid, profile_uid: props.profileUid });
//       props.onSubmitted?.();
//     },
//     `comment:${props.parentMid}`,
//   );
//
//   return (
//     <div class="mt-2">
//       <RichEditor
//         body={store.body()}
//         onInput={store.setBody}
//         capabilities={caps}
//         tab={store.tab()}
//         onTabChange={store.setTab}
//         onCtrlEnter={() => store.submit()}
//         placeholder="Write a reply…"
//       />
//       <div class="flex justify-end mt-1">
//         <button
//           onClick={() => store.submit()}
//           disabled={store.submitting()}
//           class="px-3 py-1 text-xs font-medium rounded-lg bg-blue-600 text-white
//                  hover:bg-blue-700 disabled:opacity-40 transition-colors"
//         >
//           {store.submitting() ? "…" : "Reply"}
//         </button>
//       </div>
//     </div>
//   );
// }
