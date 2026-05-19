import { get, set, del } from "idb-keyval";

export const storageGet = <T>(key: string, fallback: T): Promise<T> =>
  get<T>(key).then((v) => (v !== undefined ? v : fallback));

export const storageSet = <T>(key: string, value: T): Promise<void> =>
  set(key, value);

export const storageDel = (key: string): Promise<void> => del(key);
