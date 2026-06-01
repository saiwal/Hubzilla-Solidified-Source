import { get, set, del, keys } from "idb-keyval";

export const storageGet = <T>(key: string, fallback: T): Promise<T> =>
  get<T>(key).then((v) => (v !== undefined ? v : fallback));

export const storageSet = <T>(key: string, value: T): Promise<void> =>
  set(key, value);

export const storageDel = (key: string): Promise<void> => del(key);

export const storageKeys = (): Promise<string[]> =>
  keys().then((ks) => ks.filter((k): k is string => typeof k === "string"));
