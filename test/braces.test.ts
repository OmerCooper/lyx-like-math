import { lyxBraces } from "../src/latex/braces";

const cases: [string, string][] = [
  ["\\frac43", "\\frac{4}{3}"],
  ["\\frac ab", "\\frac{a}{b}"],
  ["\\frac{12}{3}", "\\frac{12}{3}"],
  ["\\frac123", "\\frac{1}{2}3"],
  ["\\sqrt2", "\\sqrt{2}"],
  ["\\sqrt[3]x", "\\sqrt[3]{x}"],
  ["x^2+a_1", "x^{2}+a_{1}"],
  ["x^a", "x^{a}"],
  ["x_i^2", "x_{i}^{2}"],
  ["\\hat x", "\\hat{x}"],
  ["\\vec\\alpha", "\\vec{\\alpha}"],
  ["e^\\pi", "e^{\\pi}"],
  ["\\frac{\\frac12}{3}", "\\frac{\\frac{1}{2}}{3}"],
  // must not damage LaTeX it doesn't own
  ["\\left(x\\right)", "\\left(x\\right)"],
  ["\\{a\\}", "\\{a\\}"],
  ["a\\\\b", "a\\\\b"],
  ["x^{\\prime}", "x^{\\prime}"],
  ["90^\\circ", "90^{\\circ}"],
  ["\\text{a b}", "\\text{a b}"],
  ["x'", "x'"],
  ["\\Delta x\\cdot y", "\\Delta x\\cdot y"],
];

test.each(cases)("lyxBraces(%s)", (input, expected) => {
  expect(lyxBraces(input)).toBe(expected);
});

test("idempotent", () => {
  for (const [, out] of cases) expect(lyxBraces(out)).toBe(out);
});
