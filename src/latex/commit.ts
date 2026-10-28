import { lyxBraces } from "./braces";
import type { MathRange } from "./findMath";

export interface CommitInput {
  doc: string;
  // the existing formula, or the insertion range (selection or empty) for a new one
  target: MathRange | { from: number; to: number; display: boolean; inner?: undefined };
  latex: string;
  dirty: boolean;
  exit: "after" | "before" | "none";
}

export interface CommitPlan { from: number; to: number; insert: string; cursor: number | null }

export function planCommit({ doc, target, latex, dirty, exit }: CommitInput): CommitPlan {
  let { from, to } = target;
  const cursorAt = (before: number, after: number) =>
    exit === "after" ? after : exit === "before" ? before : null;

  // opened and closed without an edit: keep the original text byte-for-byte
  if (target.inner !== undefined && !dirty) {
    return { from, to, insert: doc.slice(from, to), cursor: cursorAt(from, to) };
  }

  const body = lyxBraces(latex.trim());
  if (!body) {
    // a display formula on lines of its own takes one line break with it
    const ownLines = (from === 0 || doc[from - 1] === "\n") && (to === doc.length || doc[to] === "\n");
    if (target.display && target.inner !== undefined && ownLines) {
      if (doc[to] === "\n") to++;
      else if (from > 0) from--;
    }
    return { from, to, insert: "", cursor: exit === "none" ? null : from };
  }

  // in a callout, quote or list item, display math stays on the line so it stays inside
  const lineStart = doc.lastIndexOf("\n", from - 1) + 1;
  const contained = /^\s*(>|[-*+]\s|\d+[.)]\s)/.test(doc.slice(lineStart, from));
  if (!target.display || contained) {
    const insert = target.display ? `$$${body}$$` : `$${body}$`;
    return { from, to, insert, cursor: cursorAt(from, from + insert.length) };
  }

  const lead = from > 0 && doc[from - 1] !== "\n" ? "\n" : "";
  const trail = to < doc.length && doc[to] !== "\n" ? "\n" : "";
  const insert = `${lead}$$\n${body}\n$$${trail}`;
  return { from, to, insert, cursor: cursorAt(from + lead.length, from + insert.length) };
}
