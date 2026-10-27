// Browser harness: a real CodeMirror editor with the plugin's MathSession (no Obsidian).
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { MathSession, mathSessionExtension } from "../src/editor/session";

declare global {
  interface Window {
    setDoc(doc: string, cursor: number): void;
    open(from: number, to: number, display: boolean, initial: string, numbered: boolean): boolean;
    docText(): string;
    errors: string[];
  }
}

window.errors = [];
window.addEventListener("error", (e) => window.errors.push(String(e.message)));

let view: EditorView;

window.setDoc = (doc, cursor) => {
  view?.destroy();
  view = new EditorView({
    state: EditorState.create({ doc, selection: { anchor: cursor }, extensions: [mathSessionExtension] }),
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
