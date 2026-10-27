import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import type { EditorView } from "@codemirror/view";
import { validateLatex } from "mathlive";
import { findMathAt, needsRawFallback } from "./latex/findMath";
import { renumberChanges, splitTag } from "./latex/numbering";
import { MathSession, mathSessionExtension } from "./editor/session";
import { showDisplayMenu } from "./editor/displayMenu";
import { initMathLiveAssets } from "./mathliveAssets";
import { FormulaPanelView, VIEW_TYPE_FORMULA_PANEL } from "./panel/FormulaPanelView";

export const RAW_FALLBACK_NOTICE = "LyX-like Math: this formula is edited as LaTeX text";

export default class LyxMathPlugin extends Plugin {
  private lastMarkdown: MarkdownView | null = null;

  async onload() {
    initMathLiveAssets(this);
    this.registerEditorExtension(mathSessionExtension);

    this.addCommand({
      id: "insert-inline",
      name: "Insert or edit inline math",
      hotkeys: [{ modifiers: ["Mod"], key: "m" }],
      editorCallback: (editor) => this.run(() => this.openAtCursor(editor, false)),
    });
    this.addCommand({
      id: "insert-display",
      name: "Insert or edit display math",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "m" }],
      editorCallback: (editor) => this.run(() => this.openAtCursor(editor, true)),
    });
    this.registerView(VIEW_TYPE_FORMULA_PANEL, (leaf) =>
      new FormulaPanelView(leaf, (latex) => this.run(() => this.insertFromPanel(latex))));
    this.addRibbonIcon("sigma", "Open LyX formula panel", () => this.run(() => this.openPanel()));
    this.addCommand({
      id: "open-formula-panel",
      name: "Open LyX formula panel",
      callback: () => this.run(() => this.openPanel()),
    });
    // the panel inserts at the cursor of the note last worked in (clicking the panel makes it active)
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      if (leaf?.view instanceof MarkdownView) this.lastMarkdown = leaf.view;
    }));
    this.lastMarkdown = this.app.workspace.getActiveViewOfType(MarkdownView);

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

  private async openPanel(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_FORMULA_PANEL)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false)!;
      await leaf.setViewState({ type: VIEW_TYPE_FORMULA_PANEL, active: true });
    }
    await workspace.revealLeaf(leaf);
  }

  // Into the open math editor, cursor in the first empty box; with none open, start inline math
  // at the note's cursor first.
  private async insertFromPanel(latex: string): Promise<void> {
    let session = MathSession.active;
    if (!session) {
      const note = this.lastMarkdown;
      if (!note?.leaf.parent || note.getMode() !== "source") {
        new Notice("LyX-like Math: click into a note first");
        return;
      }
      this.app.workspace.setActiveLeaf(note.leaf, { focus: true });
      session = await this.openAtCursor(note.editor, false);
      if (!session) return;
    }
    session.field.insert(latex, { selectionMode: "placeholder", format: "latex" });
    session.field.focus();
  }

  // Errors become a visible notice (and the console), not a silent no-op.
  private async run(action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
    } catch (e) {
      console.error("LyX-like Math:", e);
      new Notice(`LyX-like Math error: ${(e as Error).message ?? e}`);
    }
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
