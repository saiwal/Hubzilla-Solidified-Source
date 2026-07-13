/**
 * useCategoryTags.ts
 * Shared multi-category tag-chip state, previously duplicated identically
 * between PostComposer and ArticleComposer.
 */

import { createSignal } from "solid-js";

export interface CategoryTags {
  pendingCategory: () => string;
  setPendingCategory: (v: string) => void;
  categoryTags: () => string[];
  addCategoryTag: (raw: string) => void;
  removeCategoryTag: (tag: string) => void;
  onCategoryKeyDown: (e: KeyboardEvent) => void;
}

export function useCategoryTags(
  category: () => string,
  setCategory: (v: string) => void,
): CategoryTags {
  const [pendingCategory, setPendingCategory] = createSignal("");

  const categoryTags = () =>
    category().split(",").map((s) => s.trim()).filter(Boolean);

  function addCategoryTag(raw: string) {
    const incoming = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!incoming.length) return;
    const merged = [...new Set([...categoryTags(), ...incoming])];
    setCategory(merged.join(","));
    setPendingCategory("");
  }

  function removeCategoryTag(tag: string) {
    setCategory(categoryTags().filter((t) => t !== tag).join(","));
  }

  function onCategoryKeyDown(e: KeyboardEvent) {
    const val = pendingCategory().trim();
    if ((e.key === "Enter" || e.key === ",") && val) {
      e.preventDefault();
      addCategoryTag(pendingCategory());
    } else if (e.key === "Backspace" && !pendingCategory() && categoryTags().length) {
      setCategory(categoryTags().slice(0, -1).join(","));
    }
  }

  return {
    pendingCategory,
    setPendingCategory,
    categoryTags,
    addCategoryTag,
    removeCategoryTag,
    onCategoryKeyDown,
  };
}
