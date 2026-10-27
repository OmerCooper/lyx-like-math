import { Editor, Notice, Plugin } from "obsidian";
import type { EditorView } from "@codemirror/view";
import { validateLatex } from "mathlive";
import { findMathAt, needsRawFallback } from "./latex/findMath";
import { renumberChanges, splitTag } from "./latex/numbering";
import { MathSession, mathSessionExtension } from "./editor/session";
import { showDisplayMenu } from "./editor/displayMenu";
import { initMathLiveAssets } from "./mathliveAssets";

export const RAW_FALLBACK_NOTICE = "LyX-like Math: this formula is edited as LaTeX text";

export default class LyxMathPlugin extends Plugin {
  async onload() {
    initMathLiveAssets(this);
    this.registerEditorExtension(mathSessionExtension);

    this.addCommand({
      id: "insert-inline",
      name: "Insert or edit inline math",
      hotkeys: [{ modifiers: ["Mod"], key: "m" }],
      editorCallback: (editor) => this.openAtCursor(editor, false),
    });
    this.addCommand({
      id: "insert-display",
      name: "Insert or edit display math",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "m" }],
      editorCallback: (editor) => this.openAtCursor(editor, true),
    });
    this.addCommand({
      id: "renumber-equations",
      name: "Renumber equations",
      editorCallback: (editor) => {
        const view = cmView(editor);
        view.dispatch({ changes: renumberChanges(view.state.doc.toString()), userEvent: "input.lyx-math" });
      },
    });
  }

  onunload() {
    MathSession.active?.commit("none");
  }

  // Edit the formula under the cursor, or start a new one (from the selection, if any).
  // Display math (Ctrl+Shift+M) first asks: plain or numbered.
  async openAtCursor(editor: Editor, display: boolean): Promise<MathSession | null> {
    const view = cmView(editor);
    const doc = view.state.doc.toString();
    const sel = view.state.selection.main;
    const existing = findMathAt(doc, sel.head);
    if (existing) {
      if (needsRawFallback(existing, validateLatex)) {
        new Notice(RAW_FALLBACK_NOTICE);
        return null;
      }
      const { body, tag } = splitTag(existing.inner);
      let numbered = tag !== null;
      if (display && existing.display) {
        const choice = await showDisplayMenu(view, numbered);
        if (choice === null) return null;
        numbered = choice;
      }
      return MathSession.open(view, existing, body, numbered);
    }
    let numbered = false;
    if (display) {
      const choice = await showDisplayMenu(view, null);
      if (choice === null) return null;
      numbered = choice;
    }
    return MathSession.open(view, { from: sel.from, to: sel.to, display }, doc.slice(sel.from, sel.to), numbered);
  }
}

function cmView(editor: Editor): EditorView {
  return (editor as unknown as { cm: EditorView }).cm;
}
