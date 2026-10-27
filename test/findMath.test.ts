import { findAllMath, findMathAt, needsRawFallback } from "../src/latex/findMath";

const doc = "Energy $E=mc^2$ costs \\$5 and $ 6, `$x$` ok.\n$$\n\\frac{a}{b}\n$$\nend";

test("inline", () => {
  const p = doc.indexOf("mc");
  expect(findMathAt(doc, p)).toEqual({ from: 7, to: 15, inner: "E=mc^2", display: false });
});
test("on delimiter counts", () => {
  expect(findMathAt(doc, 7)?.inner).toBe("E=mc^2");
});
test("escaped dollar is not math", () => {
  expect(findMathAt(doc, doc.indexOf("\\$5") + 2)).toBeNull();
});
test('"$ 6" with space is not math', () => {
  expect(findMathAt(doc, doc.indexOf("$ 6") + 2)).toBeNull();
});
test("inline code is not math", () => {
  expect(findMathAt(doc, doc.indexOf("$x$") + 1)).toBeNull();
});
test("display block across lines", () => {
  const r = findMathAt(doc, doc.indexOf("frac"))!;
  expect(r.display).toBe(true);
  expect(r.inner).toBe("\n\\frac{a}{b}\n");
  expect(doc.slice(r.from, r.to)).toBe("$$\n\\frac{a}{b}\n$$");
});
test("plain text", () => {
  expect(findMathAt(doc, doc.length - 1)).toBeNull();
});
test("fenced code block is not math", () => {
  const d = "```\n$a$\n```\n";
  expect(findMathAt(d, d.indexOf("a"))).toBeNull();
});

const ok = () => [];
const r = (inner: string, display = false) => ({ from: 0, to: 0, inner, display });
test.each(["\\begin{aligned}a&=b\\end{aligned}", "x \\label{eq}", "x \\tag{A}", "a\\\\\nb"])(
  "fallback for %s", (s) => expect(needsRawFallback(r(s, true), ok)).toBe(true));
test("numbered equation is not a fallback, and its tag isn't validated", () => {
  const seen: string[] = [];
  expect(needsRawFallback(r("\nx \\tag{1}\n", true), (s) => { seen.push(s); return []; })).toBe(false);
  expect(seen).toEqual(["x"]);
});
test("findAllMath lists formulas in order", () => {
  expect(findAllMath("$a$ and $$b$$").map((m) => m.inner)).toEqual(["a", "b"]);
});
test("fallback when validator reports errors", () => {
  expect(needsRawFallback(r("\\mymacro x"), () => [{ code: "unknown-command" }])).toBe(true);
});
test("display block with surrounding newlines is fine", () => {
  expect(needsRawFallback(r("\n\\frac{a}{b}\n", true), ok)).toBe(false);
});
