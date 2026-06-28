import { createSignal } from "solid-js";
import type { DirectoryParams } from "./api";

export type NetworkFilter = DirectoryParams["network"] | "all";

const [network, setNetwork] = createSignal<NetworkFilter>("all");
const [safe, setSafe] = createSignal<0 | 1>(0);
const [pubforums, setPubforums] = createSignal<0 | 1>(0);
const [globalDir, setGlobalDir] = createSignal<0 | 1>(1);

export { network, setNetwork, safe, setSafe, pubforums, setPubforums, globalDir, setGlobalDir };
