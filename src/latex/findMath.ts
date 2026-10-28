import { formulaParts } from "./tag";
import { withMacrosExpanded } from "./macros";

export interface MathRange {
  from: number; // start of the opening delimiter
  to: number; // just past the closing delimiter
  inner: string; // text between the delimiters
  display: boolean;
}

// Ranges of fenced code blocks (``` or ~~~), where $ is never math.
function fencedRanges(doc: string): [number, number][] {
  const ranges: [number, number][] = [];
  const re = /^[ \t]*(`{3,}|~{3,})/gm;
  let open: { start: number; fence: string } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(doc))) {
    if (!open) open = { start: m.index, fence: m[1] };
    else if (m[1][0] === open.fence[0] && m[1].length >= open.fence.length) {
      const lineEnd = doc.indexOf("\n", m.index);
      ranges.push([open.start, lineEnd === -1 ? doc.length : lineEnd]);
      open = null;
    }
  }
  if (open) ranges.push([open.start, doc.length]);
  return ranges;
}

// All formulas in the document, in order (Obsidian's delimiter rules).
export function findAllMath(doc: string): MathRange[] {
  const result: MathRange[] = [];
  const fences = fencedRanges(doc);
  let f = 0;
  let i = 0;
  while (i < doc.length) {
    while (f < fences.length && fences[f][1] <= i) f++;
    if (f < fences.length && i >= fences[f][0]) { i = fences[f][1]; continue; }

    const c = doc[i];
    if (c === "\\") { i += 2; continue; }
    if (c === "`") {
      let n = 0;
      while (doc[i + n] === "`") n++;
      const close = doc.indexOf("`".repeat(n), i + n);
      i = close === -1 ? i + n : close + n;
      continue;
    }
    if (c !== "$") { i++; continue; }

    if (doc[i + 1] === "$") {
      const close = findUnescaped(doc, "$$", i + 2);
      if (close === -1) { i += 2; continue; }
      result.push({ from: i, to: close + 2, inner: doc.slice(i + 2, close), display: true });
      i = close + 2;
      continue;
    }

    const close = findInlineClose(doc, i);
    if (close === -1) { i++; continue; }
    result.push({ from: i, to: close + 1, inner: doc.slice(i + 1, close), display: false });
    i = close + 1;
  }
  return result;
}

function findUnescaped(doc: string, needle: string, from: number): number {
  for (let j = from; j <= doc.length - needle.length; j++) {
    if (doc[j] === "\\") { j++; continue; }
    if (doc.startsWith(needle, j)) return j;
  }
  return -1;
}

// Closing $ for an inline formula opened at `open`, on the same line; -1 if none.
// Opening $ must not be followed by a space, closing $ not preceded by a space or followed by a digit.
function findInlineClose(doc: string, open: number): number {
  const first = doc[open + 1];
  if (first === undefined || /\s/.test(first)) return -1;
  for (let j = open + 1; j < doc.length; j++) {
    const c = doc[j];
    if (c === "\n") return -1;
    if (c === "\\") { j++; continue; }
    if (c === "$") {
      if (/\s/.test(doc[j - 1]) || /\d/.test(doc[j + 1] ?? "")) return -1;
      return j;
    }
  }
  return -1;
}

export function findMathAt(doc: string, pos: number): MathRange | null {
  return findAllMath(doc).find((r) => r.from <= pos && pos < r.to) ?? null;
}

// Formulas the visual editor can't round-trip are left to plain-text editing.
export function needsRawFallback(range: MathRange, validate: (latex: string) => unknown[]): boolean {
  // a display equation's plugin number (\tag{3}) is split off; any other \tag is the user's own
  const latex = formulaParts(range).body;
  // matrices (from the formula panel) are edited in the math editor; other environments are not
  const rest = latex.replace(/\\(begin|end)\{[pbBvV]?matrix\}/g, "");
  if (/\\(begin|label|tag)\b/.test(rest) || latex.includes("\n")) return true;
  return validate(withMacrosExpanded(latex)).length > 0;
}
