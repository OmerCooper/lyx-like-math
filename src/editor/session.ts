import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { Extension, Prec, StateEffect, StateField } from "@codemirror/state";
import type { MathfieldElement } from "mathlive";
import { CommitInput, planCommit } from "../latex/commit";
import { withoutPlaceholders } from "../latex/braces";
import { renumberChanges, splitTag, withTag } from "../latex/numbering";
import { configureAfterMount, createLyxMathField } from "./mathField";

type Target = CommitInput["target"];
type Exit = "after" | "before" | "none";

class MathFieldWidget extends WidgetType {
  constructor(readonly field: MathfieldElement, readonly display: boolean) { super(); }

  toDOM(): HTMLElement {
    const wrap = document.createElement(this.display ? "div" : "span");
    wrap.className = this.display ? "lyx-math-widget lyx-math-widget-block" : "lyx-math-widget";
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
    if (spec && tr.docChanged) {
      spec = { ...spec, from: tr.changes.mapPos(spec.from, -1), to: tr.changes.mapPos(spec.to, 1) };
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

export const mathSessionExtension: Extension = Prec.highest(widgetField);

export class MathSession {
  static active: MathSession | null = null;
  // told when an editor opens (true) or closes (false)
  static onActiveChange: ((open: boolean) => void) | null = null;

  readonly field: MathfieldElement;
  private baseline = "";
  private closed = false;

  private constructor(
    private view: EditorView,
    private target: Target,
    initial: string,
    private numbered: boolean,
  ) {
    this.field = createLyxMathField(target.display, initial, {
      onExit: (dir) => this.commit(dir),
      // focus leaving the window (alt-tab) is not leaving the formula
      onBlur: () => setTimeout(() => { if (document.hasFocus()) this.commit("none"); }, 0),
      onDirty: () => {},
    });
  }

  // `initial` is the formula without its number; `numbered` is whether it gets one.
  static open(view: EditorView, target: Target, initial: string, numbered = false): MathSession | null {
    MathSession.active?.commit("none");
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
    requestAnimationFrame(() => {
      session.field.focus();
      session.field.executeCommand("moveToMathfieldEnd");
    });
    return session;
  }

  commit(exit: Exit): void {
    if (this.closed) return;
    this.closed = true;
    if (MathSession.active === this) {
      MathSession.active = null;
      MathSession.onActiveChange?.(false);
    }

    const spec = this.view.state.field(widgetField);
    const target = spec ? { ...this.target, from: spec.from, to: spec.to } : this.target;
    const doc = this.view.state.doc.toString();
    const body = withoutPlaceholders(this.field.value);
    const wasNumbered = target.inner !== undefined && splitTag(target.inner).tag !== null;
    const dirty = body !== this.baseline || this.numbered !== wasNumbered;
    // an empty formula is deleted, number and all
    const latex = body.trim() ? withTag(body, this.numbered) : "";
    const plan = planCommit({ doc, target, latex, dirty, exit });
    const changed = plan.insert !== doc.slice(plan.from, plan.to);
    const newDoc = doc.slice(0, plan.from) + plan.insert + doc.slice(plan.to);

    // one transaction (one undo step): the formula, then renumbering of the whole note
    this.view.dispatch(
      {
        changes: changed ? { from: plan.from, to: plan.to, insert: plan.insert } : undefined,
        selection: plan.cursor !== null ? { anchor: plan.cursor } : undefined,
        effects: setWidget.of(null),
        userEvent: "input.lyx-math",
      },
      { changes: renumberChanges(newDoc), sequential: true },
    );
    if (exit !== "none") this.view.focus();
  }
}
