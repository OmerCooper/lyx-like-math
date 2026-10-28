import { MathfieldElement } from "mathlive";
import { commandTemplate, typedCommand } from "../latex/commands";
import { latexModeKeyAction } from "./keys";
import { EXTRA_MACROS } from "../latex/macros";

export interface LyxFieldEvents {
  onExit(dir: "after" | "before"): void;
  onBlur(): void;
  onDirty(): void;
}

// <math-field> can be registered only once per window. After the plugin is disabled and
// re-enabled, it is still registered to the class from the first load, and constructing this
// bundle's class throws "Illegal constructor" — so always use the registered one.
export function registeredMathfield(): typeof MathfieldElement {
  return (customElements.get("math-field") as typeof MathfieldElement | undefined) ?? MathfieldElement;
}

const configured = new WeakSet<MathfieldElement>();
const initialValue = new WeakMap<MathfieldElement, string>();

// A MathLive field that behaves like LyX: only \commands, ^ and _ do anything special.
// Returned unmounted; configureAfterMount runs on the `mount` event (or call it yourself).
export function createLyxMathField(display: boolean, initial: string, ev: LyxFieldEvents): MathfieldElement {
  const mf = new (registeredMathfield())();
  mf.classList.add(display ? "lyx-math-block" : "lyx-math-inline");
  mf.mathVirtualKeyboardPolicy = "manual";
  mf.smartFence = false;
  mf.smartSuperscript = false;
  mf.smartMode = false;
  initialValue.set(mf, initial);
  mf.addEventListener("mount", () => configureAfterMount(mf));

  mf.addEventListener("keydown", (e) => {
    if (mf.mode === "latex") {
      const action = latexModeKeyAction(e.key, { ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey });
      if (action === "complete") {
        e.preventDefault();
        e.stopPropagation();
      }
      // for complete-then-type the key goes on to MathLive and is typed into the first box
      if (action !== "none") finishCommand(mf);
      if (action === "complete-then-type" && e.key === "\\") clearSelection(mf);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      ev.onExit("after");
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.altKey) {
      // in Obsidian the plugin's keymap scope has already run it (Ctrl+Enter is an Obsidian hotkey)
      const handled = e.defaultPrevented;
      e.preventDefault();
      e.stopPropagation();
      if (!handled) matrixCommand(mf, e.shiftKey ? "addColumnAfter" : "addRowAfter");
    } else if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      lyxTab(mf);
    } else if (e.key === "\\") {
      clearSelection(mf);
    }
  }, true);

  mf.addEventListener("move-out", (e) => {
    e.preventDefault();
    ev.onExit((e as CustomEvent<{ direction: string }>).detail.direction === "backward" ? "before" : "after");
  });
  mf.addEventListener("focusout", () => ev.onBlur());
  mf.addEventListener("input", () => ev.onDirty());
  return mf;
}

// Replace the \command being typed with the command and its empty boxes, cursor in the first box.
// (MathLive's own completion inserts \sqrt, \hat, ... without a box, so what you type next
// lands outside them.)
function finishCommand(mf: MathfieldElement): void {
  const command = typedCommand(mf.getValue(0, mf.position));
  mf.executeCommand(["complete", "reject"]);
  if (command) mf.insert(commandTemplate(command), { selectionMode: "placeholder", format: "latex" });
}

// LyX Tab: go to the next empty box if there is one ahead, otherwise leave the current box.
// (MathLive's Tab selects the whole formula when no box is left, so the next key replaces it.)
function lyxTab(mf: MathfieldElement): void {
  const before = mf.position;
  mf.executeCommand("moveToNextPlaceholder");
  if (mf.position > before) return;
  mf.position = before;
  mf.executeCommand("moveAfterParent");
}

// Ctrl+Enter: new row, Ctrl+Shift+Enter: new column — only inside a matrix. Elsewhere MathLive
// would turn the formula into a multi-line one, which v1 doesn't support, so that is undone.
// Returns false when the cursor wasn't in a matrix.
export function matrixCommand(mf: MathfieldElement, command: "addRowAfter" | "addColumnAfter"): boolean {
  const before = mf.value;
  const position = mf.position;
  mf.executeCommand(command);
  const environments = (latex: string) => (latex.match(/\\begin\{|\\displaylines/g) ?? []).length;
  if (environments(mf.value) > environments(before)) {
    mf.value = before;
    mf.position = position;
    return false;
  }
  return true;
}


// MathLive leaves a typed "\" selected when it replaces a selected empty box, so the next
// letter overwrites it; put the cursor in the box instead so "\" starts a command cleanly.
function clearSelection(mf: MathfieldElement): void {
  if (mf.selectionIsCollapsed) return;
  const [start] = mf.selection.ranges[0];
  mf.selection = { ranges: [[start, start]] };
}

// Options MathLive only accepts once the field is in the DOM. Safe to call more than once.
export function configureAfterMount(mf: MathfieldElement): void {
  if (configured.has(mf) || !mf.isConnected) return;
  configured.add(mf);
  mf.inlineShortcuts = {};
  mf.keybindings = mf.keybindings.filter((k) => k.key !== "/");
  mf.menuItems = [];
  mf.macros = { ...mf.macros, ...EXTRA_MACROS };
  mf.value = initialValue.get(mf) ?? "";
}
