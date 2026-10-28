// Browser harness: a real MathLive field configured exactly as in the plugin.
import { configureAfterMount, createLyxMathField, matrixCommand } from "../src/editor/mathField";
import { lyxBraces, withoutPlaceholders } from "../src/latex/braces";
import { buttonMarkup } from "../src/panel/render";
import { SYMBOL_GROUPS } from "../src/panel/symbols";
import type { MathfieldElement } from "mathlive";
import { initMathLiveAssets } from "../src/mathliveAssets";

declare global {
  interface Window {
    makeField(display: boolean, initial: string): void;
    fieldValue(): string;
    insertLatex(latex: string): void;
    useAppKeymap(): void;
    rawCommandShown(): string;
    badButtons(): string[];
    mathFontsLoaded(): Promise<boolean>;
    exits: string[];
  }
}

window.exits = [];
let current: MathfieldElement | null = null;
let appKeymap = false;

window.makeField = (display, initial) => {
  current?.remove();
  window.exits = [];
  appKeymap = false;
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
  current?.insert(latex, { selectionMode: "placeholder", format: "latex" });
};

// Obsidian handles its own hotkeys (Ctrl+Enter = open link) before the math field sees the key;
// the plugin's keymap scope runs the matrix command there and marks the key handled.
window.useAppKeymap = () => { appKeymap = true; };
window.addEventListener("keydown", (e) => {
  if (!appKeymap || !current || e.key !== "Enter" || !e.ctrlKey) return;
  matrixCommand(current, e.shiftKey ? "addColumnAfter" : "addRowAfter");
  e.preventDefault();
}, true);

// a \command shown as text instead of as a symbol
const rawCommand = (root: ParentNode) => {
  const text = Array.from(root.querySelectorAll("span")).filter((s) => !s.children.length)
    .map((s) => s.textContent ?? "").join("");
  return text.match(/\\[a-zA-Z]+/)?.[0] ?? "";
};
window.rawCommandShown = () => (current?.shadowRoot ? rawCommand(current.shadowRoot) : "");

window.badButtons = () => SYMBOL_GROUPS.flatMap((g) => g.items).filter((latex) => {
  const div = document.createElement("div");
  div.innerHTML = buttonMarkup(latex);
  return rawCommand(div) !== "";
});

// MathLive's fonts as the plugin ships them: embedded in styles.css, never fetched
initMathLiveAssets();
window.mathFontsLoaded = async () => {
  await document.fonts.ready;
  const katex = Array.from(document.fonts).filter((f) => f.family.replace(/"/g, "").startsWith("KaTeX_"));
  await Promise.all(katex.map((f) => f.load().catch(() => f)));
  return katex.length === 20 && katex.every((f) => f.status === "loaded");
};
