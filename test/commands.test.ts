import { commandTemplate, typedCommand } from "../src/latex/commands";

test.each([
  ["\\sqrt", "\\sqrt{#?}"],
  ["\\frac", "\\frac{#?}{#?}"],
  ["\\hat", "\\hat{#?}"],
  ["\\mathbb", "\\mathbb{#?}"],
  ["\\Delta", "\\Delta"],
  ["\\cdot", "\\cdot"],
  ["\\mymacro", "\\mymacro"],
])("commandTemplate(%s)", (name, expected) => {
  expect(commandTemplate(name)).toBe(expected);
});

test("typedCommand takes the command at the end of the text before the caret", () => {
  expect(typedCommand("x+\\sqrt")).toBe("\\sqrt");
  expect(typedCommand("\\frac{1}{2}\\alpha")).toBe("\\alpha");
});
test("typedCommand is null when no command is being typed", () => {
  expect(typedCommand("x+y")).toBeNull();
  expect(typedCommand("\\")).toBeNull();
});
