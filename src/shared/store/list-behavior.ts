import { createSignal } from "solid-js";

export type ListBehavior = "list" | "inbox";

const [listBehavior, setListBehaviorGlobal] = createSignal<ListBehavior>(
  (localStorage.getItem("hz-list-behavior") as ListBehavior) ?? "list"
);

export function useListBehavior() { return listBehavior; }

export function setListBehavior(value: ListBehavior) {
  setListBehaviorGlobal(value);
  localStorage.setItem("hz-list-behavior", value);
}
