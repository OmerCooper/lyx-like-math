import { Decoration, DecorationSet, EditorView, ViewPlugin, WidgetType } from "@codemirror/view";
import { ChangeSet, EditorState, Extension, Prec, StateEffect, StateField } from "@codemirror/state";
import type { MathfieldElement } from "mathlive";
import { CommitInput, planCommit } from "../latex/commit";
import { withoutPlaceholders } from "../latex/braces";
import { formulaParts, renumberChanges, withTag } from "../latex/numbering";
import { findMathAt } from "../latex/findMath";
import { configureAfterMount, createLyxMathField } from "./mathField";

type Target = CommitInput["target"];
type Exit = "after" | "before" | "none";

class MathFieldWidget extends WidgetType {
  constructor(readonly field: MathfieldElement, readonly display: boolean) { super(); }

  toDOM(): HTMLElement {
    const wrap = createEl(this.display ? "div" : "span",
      { cls: this.display ? "lyx-math-widget lyx-math-widget-block" : "lyx-math-widget" });
    wrap.appendChild(this.field);
    return wrap;
  }

  eq(other: MathFieldWidget): boolean { return other.field === this.field; }

  // keys and clicks belong to MathLive, not CodeMirror
  ignoreEvent(): boolean { return true; }
}

interface WidgetSpec { from: number; to: number; widget: MathFieldWidget }

const setWidget = StateEffect.define<WidgetSpec | null>();

// The open editor replaces the formula's text range until it is committed.
const widgetField = StateField.define<WidgetSpec | null>({
  create: () => null,
  update(spec, tr) {
    // text inserted at the formula's edges from outside stays outside it
    if (spec && tr.docChanged) {
      if (spec.from === spec.to) {
        const at = tr.changes.mapPos(spec.from, -1);
        spec = { ...spec, from: at, to: at };
      } else {
        const from = tr.changes.mapPos(spec.from, 1);
        spec = { ...spec, from, to: Math.max(from, tr.changes.mapPos(spec.to, -1)) };
      }
    }
    for (const e of tr.effects) if (e.is(setWidget)) spec = e.value;
    return spec;
  },
  provide: (f) => EditorView.decorations.from(f, (spec): DecorationSet => {
    if (!spec) return Decoration.none;
    const deco = spec.from === spec.to
      ? Decoration.widget({ widget: spec.widget, side: 1 })
      : Decoration.replace({ widget: spec.widget });
    return Decoration.set([deco.range(spec.from, spec.to)]);
  }),
});


export class MathSession {
  static active: MathSession | null = null;
  // told when an editor opens (true) or closes (false)
  static onActiveChange: ((open: boolean) => void) | null = null;
  // given an edited formula that could not be written back to its note
  static onLost: ((latex: string) => void) | null = null;

  readonly field: MathfieldElement;
  private baseline = "";
  private closed = false;
  // the formula's text when opened (existing formulas): it must still be there to be replaced
  private readonly original: string | null;
  // panel inserts wait until the editor has focus and its cursor is placed
  private ready = false;
  private pending: string[] = [];

  private constructor(
    readonly view: EditorView,
    private target: Target,
    initial: string,
    private numbered: boolean,
  ) {
    this.original = target.inner !== undefined ? view.state.doc.sliceString(target.from, target.to) : null;
    this.field = createLyxMathField(target.display, initial, {
      onExit: (dir) => this.commit(dir),
      // focus leaving the window (alt-tab) is not leaving the formula
      onBlur: () => window.setTimeout(() => { if (document.hasFocus()) this.commit("none"); }, 0),
      onDirty: () => {},
    });
  }

  // `initial` is the formula without its number; `numbered` is whether it gets one.
  // `target` may be from before the open editor (if any) is committed; it is mapped across that.
  static open(view: EditorView, target: Target, initial: string, numbered = false): MathSession | null {
    const prior = MathSession.active;
    const changes = prior?.commit("none");
    if (changes && !changes.empty && prior!.view === view) {
      const mapped = remapTarget(view.state.doc.toString(), target, changes);
      if (!mapped) return null;
      target = mapped;
    }
    const session = new MathSession(view, target, initial, numbered);
    const widget = new MathFieldWidget(session.field, target.display);
    view.dispatch({ effects: setWidget.of({ from: target.from, to: target.to, widget }) });
    if (!session.field.isConnected) {
      view.dispatch({ effects: setWidget.of(null) });
      return null;
    }
    configureAfterMount(session.field);
    session.baseline = withoutPlaceholders(session.field.value);
    MathSession.active = session;
    MathSession.onActiveChange?.(true);
    window.requestAnimationFrame(() => {
      session.field.focus();
      session.field.executeCommand("moveToMathfieldEnd");
      session.ready = true;
      for (const latex of session.pending.splice(0)) session.insertTemplate(latex);
    });
    return session;
  }

  // Insert a template ("#?" = empty box) with the cursor in its first box.
  insertTemplate(latex: string): void {
    if (!this.ready) {
      this.pending.push(latex);
      return;
    }
    this.field.insert(latex, { selectionMode: "placeholder", format: "latex" });
    this.field.focus();
  }

  // Write the formula back. Returns the note's changes (null if nothing was written).
  commit(exit: Exit): ChangeSet | null {
    if (this.closed) return null;
    const spec = this.view.state.field(widgetField, false);
    const doc = this.view.state.doc.toString();
    // the editor lost its place (another note loaded) or the formula was changed from outside
    if (!spec || (this.original !== null && doc.slice(spec.from, spec.to) !== this.original)) {
      this.abandon(true);
      return null;
    }
    this.close();

    const target = { ...this.target, from: spec.from, to: spec.to };
    const body = withoutPlaceholders(this.field.value);
    const wasNumbered = target.inner !== undefined && formulaParts(target).numbered;
    const dirty = body !== this.baseline || this.numbered !== wasNumbered;
    // an empty formula is deleted, number and all
    const latex = body.trim() ? withTag(body, this.numbered) : "";
    const plan = planCommit({ doc, target, latex, dirty, exit });
    const changed = plan.insert !== doc.slice(plan.from, plan.to);
    const newDoc = doc.slice(0, plan.from) + plan.insert + doc.slice(plan.to);

    // one transaction (one undo step): the formula, then renumbering of the whole note
    const tr = this.view.state.update(
      {
        changes: changed ? { from: plan.from, to: plan.to, insert: plan.insert } : undefined,
        selection: plan.cursor !== null ? { anchor: plan.cursor } : undefined,
        effects: setWidget.of(null),
        userEvent: "input.lyx-math",
      },
      { changes: renumberChanges(newDoc), sequential: true },
    );
    this.view.dispatch(tr);
    if (exit !== "none") this.view.focus();
    return tr.changes;
  }

  // Close without writing to the note; an edited formula goes to onLost so it isn't gone.
  abandon(viewAlive: boolean): void {
    if (this.closed) return;
    this.close();
    const body = withoutPlaceholders(this.field.value);
    if (body.trim() && body !== this.baseline) MathSession.onLost?.(body);
    if (viewAlive && this.view.state.field(widgetField, false)) this.view.dispatch({ effects: setWidget.of(null) });
  }

  private close(): void {
    this.closed = true;
    if (MathSession.active === this) {
      MathSession.active = null;
      MathSession.onActiveChange?.(false);
    }
  }
}

// Where `target` (from the note before `changes`) is now; null if the formula is gone.
function remapTarget(doc: string, target: Target, changes: ChangeSet): Target | null {
  if (target.inner === undefined) {
    const from = changes.mapPos(target.from, 1);
    return { from, to: Math.max(from, changes.mapPos(target.to, -1)), display: target.display };
  }
  const range = findMathAt(doc, changes.mapPos(target.from, 1));
  return range && range.display === target.display ? range : null;
}

// The editor view going away (tab closed, another note loaded) closes its math editor.
const sessionLifecycle = ViewPlugin.define((view) => ({
  destroy: () => {
    if (MathSession.active?.view === view) MathSession.active.abandon(false);
  },
}));

export const mathSessionExtension: Extension = [Prec.highest(widgetField), sessionLifecycle];

// The note range the open math editor replaces, if one is open in this editor.
export function editingRange(state: EditorState): { from: number; to: number } | null {
  const spec = state.field(widgetField, false);
  return spec ? { from: spec.from, to: spec.to } : null;
}
