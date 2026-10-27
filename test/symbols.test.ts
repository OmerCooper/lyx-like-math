import { SYMBOL_GROUPS, filterSymbols } from "../src/panel/symbols";

test("groups in LyX toolbar order", () => {
  expect(SYMBOL_GROUPS.map((g) => g.name)).toEqual(["Fractions & roots", "Accents", "Greek", "Operators",
    "Relations", "Arrows", "Big operators", "Delimiters", "Functions", "Misc"]);
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
