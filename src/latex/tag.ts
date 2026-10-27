// An equation number the plugin manages: \tag{<digits>}. \tag{*} or \tag{A} are the user's own.
export const NUMERIC_TAG = /\s*\\tag\{(\d+)\}\s*/;

export function splitTag(inner: string): { body: string; tag: number | null } {
  const m = NUMERIC_TAG.exec(inner);
  if (!m) return { body: inner.trim(), tag: null };
  return { body: (inner.slice(0, m.index) + " " + inner.slice(m.index + m[0].length)).trim(), tag: Number(m[1]) };
}

// What the math editor opens with: a display equation's number is split off (and kept);
// inline math has no plugin number, so any \tag stays part of the formula.
export function formulaParts(range: { inner: string; display: boolean }): { body: string; numbered: boolean } {
  if (!range.display) return { body: range.inner.trim(), numbered: false };
  const { body, tag } = splitTag(range.inner);
  return { body, numbered: tag !== null };
}
