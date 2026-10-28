import { validateLatex } from "mathlive";
import { planCommit } from "../src/latex/commit";
import { lyxBraces } from "../src/latex/braces";
import { needsRawFallback } from "../src/latex/findMath";
import { formulaParts } from "../src/latex/numbering";

// C2: cancelling a new display formula must not join lines
test("empty new display formula leaves the text alone", () => {
  const doc = "line one\nline two";
  expect(planCommit({ doc, target: { from: 8, to: 8, display: true }, latex: "", dirty: true, exit: "after" }))
    .toEqual({ from: 8, to: 8, insert: "", cursor: 8 });
  expect(planCommit({ doc, target: { from: 9, to: 9, display: true }, latex: "", dirty: true, exit: "after" }))
    .toEqual({ from: 9, to: 9, insert: "", cursor: 9 });
});
test("emptied display formula inside a text line keeps the line break", () => {
  const doc = "text $$x$$\nmore";
  expect(planCommit({ doc, target: { from: 5, to: 10, inner: "x", display: true }, latex: "", dirty: true, exit: "after" }))
    .toEqual({ from: 5, to: 10, insert: "", cursor: 5 });
});

// I4: display math in callouts and lists stays on its line
test("display math in a callout stays on the callout line", () => {
  const doc = "> a $$x$$ b";
  expect(planCommit({ doc, target: { from: 4, to: 9, inner: "x", display: true }, latex: "y", dirty: true, exit: "after" }))
    .toEqual({ from: 4, to: 9, insert: "$$y$$", cursor: 9 });
});
test("new display math in a list item stays in the item", () => {
  const doc = "- item ";
  expect(planCommit({ doc, target: { from: 7, to: 7, display: true }, latex: "y", dirty: true, exit: "after" }))
    .toEqual({ from: 7, to: 7, insert: "$$y$$", cursor: 12 });
});

// I3: starred commands
test("operatorname* is kept", () => {
  expect(lyxBraces(String.raw`\operatorname*{argmax}_x f`)).toBe(String.raw`\operatorname*{argmax}_{x} f`);
});

// I2: \dots opens in the editor
test("formula with dots is not raw text", () => {
  expect(needsRawFallback({ from: 0, to: 0, inner: String.raw`a\dots b`, display: false }, validateLatex)).toBe(false);
});

// M3: only display equations carry a plugin number
test("display tag is the number; inline tag stays the user's", () => {
  expect(formulaParts({ inner: String.raw`x \tag{3}`, display: true })).toEqual({ body: "x", numbered: true });
  expect(formulaParts({ inner: String.raw`x \tag{3}`, display: false })).toEqual({ body: String.raw`x \tag{3}`, numbered: false });
  expect(needsRawFallback({ from: 0, to: 0, inner: String.raw`x \tag{3}`, display: false }, () => [])).toBe(true);
});
