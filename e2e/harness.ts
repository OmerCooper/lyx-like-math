// Browser harness: a real MathLive field configured exactly as in the plugin.
import { configureAfterMount, createLyxMathField } from "../src/editor/mathField";
import { lyxBraces, withoutPlaceholders } from "../src/latex/braces";

declare global {
  interface Window {
    makeField(display: boolean, initial: string): void;
    fieldValue(): string;
    insertLatex(latex: string): void;
    exits: string[];
  }
}

window.exits = [];
let current: HTMLElement & { value: string; focus(): void } | null = null;

window.makeField = (display, initial) => {
  current?.remove();
  window.exits = [];
  const mf = createLyxMathField(display, initial, {
    onExit: (dir) => window.exits.push(dir),
    onBlur: () => {},
    onDirty: () => {},
  });
  document.body.appendChild(mf);
  configureAfterMount(mf);
  mf.focus();
  current = mf;
};

// what would be saved in the note
window.fieldValue = () => lyxBraces(withoutPlaceholders(current?.value ?? ""));

// what a formula panel button does
window.insertLatex = (latex) => {
  (current as unknown as { insert(l: string, o: object): void })
    .insert(latex, { selectionMode: "placeholder", format: "latex" });
};
