// LyX always writes braces: \frac{4}{3}, \sqrt{2}, x^{2}. MathLive (and old notes) use the
// short forms \frac43, \sqrt2, x^2. lyxBraces rewrites the short forms and touches nothing else.
import { ARG_COUNT } from "./commands";

// Arguments of these are text, not math: keep their contents verbatim.
const VERBATIM = new Set(["text", "operatorname"]);

interface Token { text: string; end: number; group: boolean }

function skipSpaces(s: string, i: number): number {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}

// Index just past the brace/bracket that closes the one at `start`.
function matchClose(s: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "\\") { i++; continue; }
    if (s[i] === open) depth++;
    else if (s[i] === close && --depth === 0) return i + 1;
  }
  return s.length;
}

function readToken(s: string, i: number): Token | null {
  if (i >= s.length) return null;
  if (s[i] === "{") {
    const end = matchClose(s, i, "{", "}");
    return { text: s.slice(i + 1, end - 1), end, group: true };
  }
  if (s[i] === "\\") {
    const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i));
    const len = m ? m[0].length : 1;
    return { text: s.slice(i, i + len), end: i + len, group: false };
  }
  return { text: s[i], end: i + 1, group: false };
}

// Read one argument at i and return it braced.
function bracedArg(s: string, i: number, verbatim: boolean): { out: string; end: number } | null {
  const tok = readToken(s, skipSpaces(s, i));
  if (!tok) return null;
  const inner = tok.group && !verbatim ? lyxBraces(tok.text) : tok.text;
  return { out: `{${inner}}`, end: tok.end };
}

export function lyxBraces(latex: string): string {
  let out = "";
  let i = 0;
  while (i < latex.length) {
    const c = latex[i];
    if (c === "^" || c === "_") {
      const arg = bracedArg(latex, i + 1, false);
      if (!arg) { out += c; i++; continue; }
      out += c + arg.out;
      i = arg.end;
    } else if (c === "{") {
      const tok = readToken(latex, i)!;
      out += `{${lyxBraces(tok.text)}}`;
      i = tok.end;
    } else if (c === "\\") {
      const tok = readToken(latex, i)!;
      out += tok.text;
      i = tok.end;
      const name = tok.text.slice(1);
      const count = ARG_COUNT[name];
      if (!count) continue;
      if (name === "sqrt") {
        const j = skipSpaces(latex, i);
        if (latex[j] === "[") {
          const end = matchClose(latex, j, "[", "]");
          out += `[${lyxBraces(latex.slice(j + 1, end - 1))}]`;
          i = end;
        }
      }
      for (let n = 0; n < count; n++) {
        const arg = bracedArg(latex, i, VERBATIM.has(name));
        if (!arg) break;
        out += arg.out;
        i = arg.end;
      }
    } else {
      out += c;
      i++;
    }
  }
  return out;
}
