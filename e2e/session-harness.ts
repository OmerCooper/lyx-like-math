// Browser harness: a real CodeMirror editor with the plugin's MathSession (no Obsidian).
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { editingRange, MathSession, mathSessionExtension } from "../src/editor/session";
import { clickToEditExtension } from "../src/editor/clickToEdit";
import { findAllMath } from "../src/latex/findMath";

declare global {
  interface Window {
    setDoc(doc: string, cursor: number, livePreview?: boolean): void;
    open(from: number, to: number, display: boolean, initial: string, numbered: boolean): boolean;
    docText(): string;
    editing(): boolean;
    rawNotices: number;
    errors: string[];
  }
}

window.errors = [];
window.addEventListener("error", (e) => window.errors.push(String(e.message)));
window.rawNotices = 0;

let view: EditorView;
let livePreview = false;

// Stand-in for Obsidian's Live Preview: formulas drawn as .math elements (not real math)
class FakeMath extends WidgetType {
  constructor(readonly text: string, readonly display: boolean) { super(); }
  eq(other: FakeMath) { return other.text === this.text; }
  toDOM() {
    const el = document.createElement(this.display ? "div" : "span");
    el.className = this.display ? "math math-block cm-embed-block" : "math math-inline";
    el.textContent = this.text;
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
    return MathSession.open(view, { from, to, display }, initial, numbered) !== null;
  } catch (e) {
    window.errors.push(String((e as Error).stack ?? e));
    return false;
  }
};

window.docText = () => view.state.doc.toString();
window.editing = () => MathSession.active !== null;
