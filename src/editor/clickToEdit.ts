import { EditorView, ViewPlugin } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { validateLatex } from "mathlive";
import { findMathAt, MathRange, needsRawFallback } from "../latex/findMath";
import { formulaParts } from "../latex/numbering";
import { MathSession } from "./session";

// Clicking a rendered formula in Live Preview opens it in the math editor, keeping its number.
// Formulas the editor can't handle (aligned, multi-line, ...) get Obsidian's usual click — the
// source text — and `onRaw` (a notice). Listens in the capture phase: rendered math widgets
// tell CodeMirror to ignore their events.
export function clickToEditExtension(isLivePreview: (view: EditorView) => boolean, onRaw: () => void): Extension {
  return ViewPlugin.define((view) => {
    const doc = view.dom.ownerDocument;
    // The press is ours from mousedown to click: given to the rendered formula, Obsidian would
    // select its source text (what is typed next would replace the formula).
    let swallowRest = false;
    let pending: MathRange | null = null;
    const onRest = (event: MouseEvent) => {
      if (!swallowRest) return;
      if (event.type === "click") swallowRest = false;
      event.preventDefault();
      event.stopPropagation();
    };
    // The editor opens on mouseup: while the button is down Live Preview keeps the rendered
    // formula drawn, and it would hide the editor. Opened with the note's cursor inside the
    // formula (as with Ctrl+M), Live Preview shows the source there, which the editor replaces.
    // (Added at mousedown, so it runs after Obsidian's own mouseup handling.)
    const onUp = (event: MouseEvent) => {
      doc.removeEventListener("mouseup", onUp, true);
      const range = pending;
      pending = null;
      if (!range) return;
      event.preventDefault();
      event.stopPropagation();
      view.dispatch({ selection: { anchor: range.from + (range.display ? 2 : 1) } });
      const { body, numbered } = formulaParts(range);
      MathSession.open(view, range, body, numbered);
    };
    const onMouseDown = (event: MouseEvent) => {
      swallowRest = false;
      pending = null;
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      const mathEl = target?.closest?.(".math");
      if (!mathEl || !view.contentDOM.contains(mathEl) || target!.closest("math-field")) return;
      if (!isLivePreview(view)) return;

      // a widget's inner element can map to the widget's end; the formula ends just before it
      const text = view.state.doc.toString();
      const pos = view.posAtDOM(mathEl);
      const range = findMathAt(text, pos) ?? (pos > 0 ? findMathAt(text, pos - 1) : null);
      if (!range) return;
      if (needsRawFallback(range, validateLatex)) {
        onRaw();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      pending = range;
      swallowRest = true;
      doc.addEventListener("mouseup", onUp, true);
    };
    view.contentDOM.addEventListener("mousedown", onMouseDown, true);
    for (const type of ["mouseup", "click", "dblclick"] as const) view.contentDOM.addEventListener(type, onRest, true);
    return {
      destroy: () => {
        doc.removeEventListener("mouseup", onUp, true);
        view.contentDOM.removeEventListener("mousedown", onMouseDown, true);
        for (const type of ["mouseup", "click", "dblclick"] as const) view.contentDOM.removeEventListener(type, onRest, true);
      },
    };
  });
}
