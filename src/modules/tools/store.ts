import { createSignal } from "solid-js";

// Module-level singleton — survives navigation per project convention.
// Stores the last active tool so returning to /tools restores state.

export type ToolId =
  | "calculator"
  | "qr"
  | "unit-converter"
  | "base64"
  | "password";

const [activeTool, setActiveTool] = createSignal<ToolId>("calculator");

export { activeTool, setActiveTool };
