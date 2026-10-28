// Commands Obsidian's MathJax knows but MathLive 0.101 doesn't; MathLive shows them as their
// equivalent, and they are saved as typed.
export const EXTRA_MACROS: Record<string, string> = { dots: "\\ldots" };

// The same LaTeX with those commands replaced, for MathLive's validator.
export function withMacrosExpanded(latex: string): string {
  return latex.replace(/\\([a-zA-Z]+)(?![a-zA-Z])/g, (m, name: string) => EXTRA_MACROS[name] ?? m);
}
