/**
 * Animation primitives for solid-motionone.
 *
 * Re-exports Motion, Presence, and the motion directive so views only need
 * one import line:
 *   import { Motion, Presence, motion, fadePreset } from "@/shared/lib/motion-presets";
 *
 * Preset usage with <Motion>:
 *   <Motion.div {...scalePreset}>...</Motion.div>
 *
 * Exit animation usage with <Presence>:
 *   <Presence>
 *     <Show when={open()}>
 *       <Motion.div {...scalePreset}>...</Motion.div>
 *     </Show>
 *   </Presence>
 *
 * Directive usage (enter-only, no Presence needed):
 *   import { motion } from "@/shared/lib/motion-presets";
 *   void motion; // keep import alive for tree-shaking
 *   <div use:motion={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}>...</div>
 */

export { Motion, Presence, motion } from "solid-motionone";
export type { Options as MotionOptions } from "solid-motionone";

// ── Presets ───────────────────────────────────────────────────────────────────

/** Simple opacity fade */
export const fadePreset = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
} as const;

/** Scale + fade — dropdowns, menus, cards */
export const scalePreset = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.15 },
} as const;

/** Slide down + fade — panels opening from top, drawers */
export const slideDownPreset = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 },
} as const;

/** Slide up + fade — sheets from bottom, toasts */
export const slideUpPreset = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.2 },
} as const;

/** Slide in from left — sidebar panels */
export const slideRightPreset = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
  transition: { duration: 0.2 },
} as const;
