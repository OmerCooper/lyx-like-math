// Browser harness: a real CodeMirror editor with the plugin's MathSession (no Obsidian).
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { editingRange, MathSession, mathSessionExtension } from "../src/editor/session";
import { clickToEditExtension } from "../src/editor/clickToEdit";
import { findAllMath, findMathAt } from "../src/latex/findMath";

declare global {
  interface Window {
    setDoc(doc: string, cursor: number, livePreview?: boolean): void;
    open(from: number, to: number, display: boolean, initial: string, numbered: boolean): boolean;
    docText(): string;
    editing(): boolean;
    rawNotices: number;
    lost: string[];
    replaceState(doc: string): void;
    externalChange(from: number, to: number, insert: string): void;
    destroyView(): void;
    insertTemplate(latex: string): void;
    errors: string[];
  }
}

// Obsidian's global createEl, as far as the plugin uses it
(window as unknown as { createEl: unknown }).createEl = (tag: string, o?: { cls?: string }) => {
  const el = document.createElement(tag);
  if (o?.cls) el.className = o.cls;
  return el;
};

window.errors = [];
window.addEventListener("error", (e) => window.errors.push(String(e.message)));
window.rawNotices = 0;

let view: EditorView;
let livePreview = false;

// Stand-in for Obsidian's Live Preview: formulas drawn as .math elements (not real math)
class FakeMath extends WidgetType {
  constructor(readonly text: string, readonly display: boolean) { super(); }
  eq(other: FakeMath) { return other.text === this.text; }
  toDOM(view: EditorView) {
    const el = document.createElement(this.display ? "div" : "span");
    el.className = this.display ? "math math-block cm-embed-block" : "math math-inline";
    el.textContent = this.text;
    // as Obsidian does: a click on rendered math puts the cursor in its source, a moment later
    el.addEventListener("click", () => setTimeout(() => {
      const pos = view.posAtDOM(el);
      view.dispatch({ selection: { anchor: Math.min(pos + 1, view.state.doc.length) } });
      view.focus();
    }, 20));
    return el;
  }
  ignoreEvent() { return true; }
}
const fakeLivePreview = StateField.define<DecorationSet>({
  create: (state) => render(state),
  update: (_, tr) => render(tr.state),
  provide: (f) => EditorView.decorations.from(f),
});
function render(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const editing = editingRange(state);
  for (const m of findAllMath(state.doc.toString())) {
    if (editing && editing.from < m.to && m.from < editing.to) continue;
    builder.add(m.from, m.to, Decoration.replace({ widget: new FakeMath(m.inner, m.display), block: m.display }));
  }
  return builder.finish();
}

window.setDoc = (doc, cursor, lp = false) => {
  view?.destroy();
  livePreview = lp;
  window.rawNotices = 0;
  view = new EditorView({
    state: EditorState.create({
      doc, selection: { anchor: cursor },
      extensions: [
        mathSessionExtension,
        clickToEditExtension(() => livePreview, () => window.rawNotices++),
        lp ? fakeLivePreview : [],
      ],
    }),
    parent: document.body,
  });
  view.focus();
};

window.open = (from, to, display, initial, numbered) => {
  try {
    // a range covering a formula opens that formula, as the plugin does
    const existing = from < to ? findMathAt(view.state.doc.toString(), from) : null;
    return MathSession.open(view, existing ?? { from, to, display }, initial, numbered) !== null;
  } catch (e) {
    window.errors.push(String((e as Error).stack ?? e));
    return false;
  }
};

window.docText = () => view.state.doc.toString();
window.editing = () => MathSession.active !== null;

// formulas the plugin couldn't write back (it copies them to the clipboard in Obsidian)
window.lost = [];
MathSession.onLost = (latex) => window.lost.push(latex);
// another note loaded into the same editor
window.replaceState = (doc) => view.setState(EditorState.create({ doc, extensions: [mathSessionExtension] }));
// a change from outside (sync, another plugin)
window.externalChange = (from, to, insert) => view.dispatch({ changes: { from, to, insert } });
window.destroyView = () => view.destroy();
// what a formula panel button does
window.insertTemplate = (latex) => MathSession.active?.insertTemplate(latex);
