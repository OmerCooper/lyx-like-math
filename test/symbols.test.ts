import { SYMBOL_GROUPS, filterSymbols } from "../src/panel/symbols";

test("groups in LyX toolbar order", () => {
  expect(SYMBOL_GROUPS.map((g) => g.name)).toEqual(["Fractions & roots", "Accents", "Greek", "Operators",
    "Relations", "Arrows", "Big operators", "Delimiters", "Matrices", "Functions", "Misc"]);
});
test("matrices start as 2x2 with empty cells", () => {
  const m = SYMBOL_GROUPS.find((g) => g.name === "Matrices")!;
  expect(m.items[0]).toBe("\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}");
  expect(filterSymbols(SYMBOL_GROUPS, "pmatrix").flatMap((g) => g.items).length).toBe(4);
});
test("frac has two boxes", () => {
  expect(SYMBOL_GROUPS[0].items[0]).toBe("\\frac{#?}{#?}");
});
test("search ignores backslash and case", () => {
  const r = filterSymbols(SYMBOL_GROUPS, "\\DELTA");
  expect(r.flatMap((g) => g.items)).toEqual(["\\delta", "\\Delta"]);
});
test("search by group name", () => {
  expect(filterSymbols(SYMBOL_GROUPS, "arrows")[0].items.length).toBe(11);
});
test("empty query returns all", () => {
  expect(filterSymbols(SYMBOL_GROUPS, "")).toEqual(SYMBOL_GROUPS);
});
