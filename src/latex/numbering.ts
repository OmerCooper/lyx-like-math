import { findAllMath } from "./findMath";
export { formulaParts, splitTag } from "./tag";

// The number is a placeholder; renumberChanges gives it its real value.
export function withTag(body: string, numbered: boolean): string {
  return numbered ? `${body} \\tag{0}` : body;
}

// Changes that number the numerically tagged display equations 1, 2, 3... in document order.
export function renumberChanges(doc: string): { from: number; to: number; insert: string }[] {
  const changes: { from: number; to: number; insert: string }[] = [];
  let n = 0;
  for (const m of findAllMath(doc)) {
    if (!m.display) continue;
    const tag = /\\tag\{(\d+)\}/.exec(m.inner);
    if (!tag) continue;
    n++;
    const from = m.from + 2 + tag.index + "\\tag{".length;
    if (tag[1] !== String(n)) changes.push({ from, to: from + tag[1].length, insert: String(n) });
  }
  return changes;
}
