import { planCommit } from "../src/latex/commit";

const doc = "see $\\frac12$ here";
const old = { from: 4, to: 13, inner: "\\frac12", display: false };

test("unchanged formula keeps bytes", () => {
  expect(planCommit({ doc, target: old, latex: "\\frac{1}{2}", dirty: false, exit: "after" }))
    .toEqual({ from: 4, to: 13, insert: "$\\frac12$", cursor: 13 });
});
test("edited inline gets braces", () => {
  expect(planCommit({ doc, target: old, latex: "\\frac13", dirty: true, exit: "after" }))
    .toEqual({ from: 4, to: 13, insert: "$\\frac{1}{3}$", cursor: 17 });
});
test("new inline at cursor", () => {
  expect(planCommit({ doc: "ab", target: { from: 1, to: 1, display: false }, latex: "x^2", dirty: true, exit: "after" }))
    .toEqual({ from: 1, to: 1, insert: "$x^{2}$", cursor: 8 });
});
test("new display mid-line goes on own lines", () => {
  expect(planCommit({ doc: "ab", target: { from: 1, to: 1, display: true }, latex: "y", dirty: true, exit: "after" }))
    .toEqual({ from: 1, to: 1, insert: "\n$$\ny\n$$\n", cursor: 10 });
});
test("new display at start of empty file", () => {
  expect(planCommit({ doc: "", target: { from: 0, to: 0, display: true }, latex: "y", dirty: true, exit: "after" }))
    .toEqual({ from: 0, to: 0, insert: "$$\ny\n$$", cursor: 7 });
});
test("empty formula is deleted", () => {
  expect(planCommit({ doc, target: old, latex: "  ", dirty: true, exit: "after" }))
    .toEqual({ from: 4, to: 13, insert: "", cursor: 4 });
});
test("empty display formula takes its line break with it", () => {
  const d = "a\n$$\nx\n$$\nb";
  const t = { from: 2, to: 9, inner: "\nx\n", display: true };
  const p = planCommit({ doc: d, target: t, latex: "", dirty: true, exit: "after" });
  expect(d.slice(0, p.from) + p.insert + d.slice(p.to)).toBe("a\nb");
});
test("exit before", () => {
  expect(planCommit({ doc, target: old, latex: "z", dirty: true, exit: "before" }).cursor).toBe(4);
});
test("exit none", () => {
  expect(planCommit({ doc, target: old, latex: "z", dirty: true, exit: "none" }).cursor).toBeNull();
});
