import { EditorView, ViewPlugin } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { validateLatex } from "mathlive";
import { findMathAt, needsRawFallback } from "../latex/findMath";
import { formulaParts } from "../latex/numbering";
import { MathSession } from "./session";

// Clicking a rendered formula in Live Preview opens it in the math editor, keeping its number.
// Formulas the editor can't handle (aligned, multi-line, ...) get Obsidian's usual click — the
// source text — and `onRaw` (a notice). Listens in the capture phase: rendered math widgets
// tell CodeMirror to ignore their events.
export function clickToEditExtension(isLivePreview: (view: EditorView) => boolean, onRaw: () => void): Extension {
  return ViewPlugin.define((view) => {
    // The mouseup and click of a press that opened the editor are ours too: given to the rendered
    // formula, Obsidian would put the cursor in its source and take the focus back (the editor
    // would close at once).
    let swallowRest = false;
    const onRest = (event: MouseEvent) => {
      if (!swallowRest) return;
      if (event.type === "click") swallowRest = false;
      event.preventDefault();
      event.stopPropagation();
    };
    const onMouseDown = (event: MouseEvent) => {
      swallowRest = false;
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      const mathEl = target?.closest?.(".math");
      if (!mathEl || !view.contentDOM.contains(mathEl) || target!.closest("math-field")) return;
      if (!isLivePreview(view)) return;

      // a widget's inner element can map to the widget's end; the formula ends just before it
      const doc = view.state.doc.toString();
      const pos = view.posAtDOM(mathEl);
      const range = findMathAt(doc, pos) ?? (pos > 0 ? findMathAt(doc, pos - 1) : null);
      if (!range) return;
      if (needsRawFallback(range, validateLatex)) {
        onRaw();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const { body, numbered } = formulaParts(range);
      swallowRest = MathSession.open(view, range, body, numbered) !== null;
    };
    view.contentDOM.addEventListener("mousedown", onMouseDown, true);
    for (const type of ["mouseup", "click", "dblclick"] as const) view.contentDOM.addEventListener(type, onRest, true);
    return {
      destroy: () => {
        view.contentDOM.removeEventListener("mousedown", onMouseDown, true);
        for (const type of ["mouseup", "click", "dblclick"] as const) view.contentDOM.removeEventListener(type, onRest, true);
      },
    };
  });
}
