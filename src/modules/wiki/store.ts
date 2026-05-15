// src/modules/wiki/store.ts
import { createSignal } from "solid-js";
import {
  fetchWikis,
  fetchWikiPages,
  fetchWikiPage,
  type WikiMeta,
  type WikiPage,
  type WikiPageResponse,
} from "./api";

// ── Wiki list ─────────────────────────────────────────────────────────────────

const [wikis, setWikis]               = createSignal<WikiMeta[]>([]);
const [wikisLoading, setWikisLoading] = createSignal(false);
const [isOwner, setIsOwner]           = createSignal(false);
const [canCreate, setCanCreate]       = createSignal(false);
const [wikisNick, setWikisNick]       = createSignal("");

export { wikis, wikisLoading, isOwner, canCreate };

export async function loadWikis(nick: string): Promise<void> {
  if (wikisNick() === nick && wikis().length > 0) return;
  setWikisNick(nick);
  setWikisLoading(true);
  try {
    const res = await fetchWikis(nick);
    setWikis(res.wikis);
    setIsOwner(res.is_owner);
    setCanCreate(res.can_create);
  } catch (e) {
    console.error("loadWikis:", e);
    setWikis([]);
  } finally {
    setWikisLoading(false);
  }
}

export function resetWikis(): void {
  setWikisNick("");
  setWikis([]);
  setIsOwner(false);
  setCanCreate(false);
}

// ── Page list ─────────────────────────────────────────────────────────────────

const [pages, setPages]               = createSignal<WikiPage[]>([]);
const [pagesLoading, setPagesLoading] = createSignal(false);
const [currentWiki, setCurrentWiki]   = createSignal<WikiMeta | null>(null);
const [canWrite, setCanWrite]         = createSignal(false);

export { pages, pagesLoading, currentWiki, canWrite };

export async function loadWikiPages(nick: string, wikiUrlName: string): Promise<void> {
  setPagesLoading(true);
  try {
    const res = await fetchWikiPages(nick, wikiUrlName);
    setCurrentWiki(res.wiki);
    setPages(res.pages);
    setCanWrite(res.can_write);
  } catch (e) {
    console.error("loadWikiPages:", e);
    setPages([]);
    setCurrentWiki(null);
  } finally {
    setPagesLoading(false);
  }
}

// ── Current page ──────────────────────────────────────────────────────────────

const [pageData, setPageData]             = createSignal<WikiPageResponse | null>(null);
const [pageLoading, setPageLoading]       = createSignal(false);
const [editMode, setEditMode]             = createSignal(false);
const [draftContent, setDraftContent]     = createSignal("");

export { pageData, pageLoading, editMode, draftContent };

export function toggleEditMode(): void {
  const entering = !editMode();
  setEditMode(entering);
  if (entering) setDraftContent(pageData()?.raw ?? "");
}

export function updateDraft(v: string): void {
  setDraftContent(v);
}

export async function loadPage(
  nick: string,
  wikiUrlName: string,
  pageUrlName: string,
): Promise<void> {
  setPageLoading(true);
  setEditMode(false);
  try {
    const res = await fetchWikiPage(nick, wikiUrlName, pageUrlName);
    setPageData(res);
    setDraftContent(res.raw);
    setCanWrite(res.can_write);
  } catch (e) {
    console.error("loadPage:", e);
    setPageData(null);
  } finally {
    setPageLoading(false);
  }
}

export function resetPage(): void {
  setPageData(null);
  setEditMode(false);
  setDraftContent("");
}
