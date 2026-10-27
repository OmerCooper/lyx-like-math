import { MathfieldElement } from "mathlive";
import { latexModeKeyAction } from "./keys";

export interface LyxFieldEvents {
  onExit(dir: "after" | "before"): void;
  onBlur(): void;
  onDirty(): void;
}

const configured = new WeakSet<MathfieldElement>();
const initialValue = new WeakMap<MathfieldElement, string>();

// A MathLive field that behaves like LyX: only \commands, ^ and _ do anything special.
// Returned unmounted; configureAfterMount runs on the `mount` event (or call it yourself).
export function createLyxMathField(display: boolean, initial: string, ev: LyxFieldEvents): MathfieldElement {
  const mf = new MathfieldElement();
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
      // for complete-then-type the key goes on to MathLive and is typed after the command
      if (action !== "none") mf.executeCommand(["complete", "accept"]);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      ev.onExit("after");
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

// Options MathLive only accepts once the field is in the DOM. Safe to call more than once.
export function configureAfterMount(mf: MathfieldElement): void {
  if (configured.has(mf) || !mf.isConnected) return;
  configured.add(mf);
  mf.inlineShortcuts = {};
  mf.keybindings = mf.keybindings.filter((k) => k.key !== "/");
  mf.menuItems = [];
  mf.value = initialValue.get(mf) ?? "";
}
