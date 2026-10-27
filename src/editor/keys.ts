export type LatexKeyAction = "complete" | "complete-then-type" | "none";

// What a key does while a \command is being typed (MathLive's LaTeX mode), LyX-style:
// Space/Esc finish the command as typed; any other non-letter finishes it and is then typed.
export function latexModeKeyAction(
  key: string,
  mods: { ctrl: boolean; alt: boolean; meta: boolean },
): LatexKeyAction {
  if (key === " " || key === "Escape") return "complete";
  if (mods.ctrl || mods.alt || mods.meta) return "none";
  if (key.length === 1 && !/[a-zA-Z]/.test(key)) return "complete-then-type";
  return "none";
}
