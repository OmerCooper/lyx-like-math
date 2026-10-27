// An equation number the plugin manages: \tag{<digits>}. \tag{*} or \tag{A} are the user's own.
export const NUMERIC_TAG = /\s*\\tag\{(\d+)\}\s*/;

export function splitTag(inner: string): { body: string; tag: number | null } {
  const m = NUMERIC_TAG.exec(inner);
  if (!m) return { body: inner.trim(), tag: null };
  return { body: (inner.slice(0, m.index) + " " + inner.slice(m.index + m[0].length)).trim(), tag: Number(m[1]) };
}
