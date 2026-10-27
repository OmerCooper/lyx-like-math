import { Editor, Notice, Plugin } from "obsidian";
import type { EditorView } from "@codemirror/view";
import { validateLatex } from "mathlive";
import { findMathAt, needsRawFallback } from "./latex/findMath";
import { MathSession, mathSessionExtension } from "./editor/session";
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
  }

  onunload() {
    MathSession.active?.commit("none");
  }

  // Edit the formula under the cursor, or start a new one (from the selection, if any).
  openAtCursor(editor: Editor, display: boolean): MathSession | null {
    const view = (editor as unknown as { cm: EditorView }).cm;
    const doc = view.state.doc.toString();
    const sel = view.state.selection.main;
    const existing = findMathAt(doc, sel.head);
    if (existing) {
      if (needsRawFallback(existing, validateLatex)) {
        new Notice(RAW_FALLBACK_NOTICE);
        return null;
      }
      return MathSession.open(view, existing, existing.inner.trim());
    }
    return MathSession.open(view, { from: sel.from, to: sel.to, display }, doc.slice(sel.from, sel.to));
  }
}
