import { latexModeKeyAction } from "../src/editor/keys";

const none = { ctrl: false, alt: false, meta: false };

test.each([
  [" ", "complete"], ["Escape", "complete"],
  ["2", "complete-then-type"], ["^", "complete-then-type"], ["_", "complete-then-type"],
  ["+", "complete-then-type"], ["\\", "complete-then-type"], ["(", "complete-then-type"],
  ["a", "none"], ["Z", "none"], ["ArrowLeft", "none"], ["Backspace", "none"], ["Shift", "none"],
] as const)("%s -> %s", (key, action) => expect(latexModeKeyAction(key, none)).toBe(action));

test("ctrl combos are left alone", () => {
  expect(latexModeKeyAction("2", { ...none, ctrl: true })).toBe("none");
});
