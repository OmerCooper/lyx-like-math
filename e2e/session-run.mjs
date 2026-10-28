// Opens MathSession in a real CodeMirror editor in local Chrome, types, and checks the note text.
// Run: npm run e2e
import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { chromium } from "playwright-core";

// [name, initial doc, cursor, display, numbered, keys, expected doc]
const CASES = [
  ["inline new", "ab", 1, false, false, ["x", "Escape"], "a$x$b"],
  ["display new", "", 0, true, false, ["y", "Escape"], "$$\ny\n$$"],
  ["numbered new", "", 0, true, true, ["y", "Escape"], "$$\ny \\tag{1}\n$$"],
  ["numbered between two", "$$\na \\tag{1}\n$$\n\n$$\nb \\tag{2}\n$$", 16, true, true, ["c", "Escape"],
    "$$\na \\tag{1}\n$$\n$$\nc \\tag{2}\n$$\n$$\nb \\tag{3}\n$$"],
  ["empty numbered is removed", "", 0, true, true, ["Escape"], ""],
];

const dist = path.resolve("e2e/dist");
fs.mkdirSync(dist, { recursive: true });
await esbuild.build({
  entryPoints: ["e2e/session-harness.ts"], bundle: true, format: "iife",
  outfile: path.join(dist, "session-harness.js"), loader: { ".css": "text" }, logLevel: "error",
});
fs.writeFileSync(path.join(dist, "session.html"),
  '<!doctype html><meta charset="utf-8"><body><script src="session-harness.js"></script></body>');

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true,
});
const page = await browser.newPage();
await page.goto("file:///" + path.join(dist, "session.html").replace(/\\/g, "/"));

let failed = 0;
let total = CASES.length + 1;
for (const [name, doc, cursor, display, numbered, keys, expected] of CASES) {
  await page.evaluate(([d, c]) => window.setDoc(d, c), [doc, cursor]);
  const opened = await page.evaluate(([c, disp, num]) => window.open(c, c, disp, "", num), [cursor, display, numbered]);
  await page.waitForTimeout(100);
  for (const k of keys) {
    if (/^[A-Z][a-zA-Z]+$/.test(k)) await page.keyboard.press(k);
    else await page.keyboard.type(k, { delay: 10 });
  }
  await page.waitForTimeout(100);
  const got = await page.evaluate(() => window.docText());
  const errors = await page.evaluate(() => window.errors.splice(0));
  const ok = opened && got === expected && errors.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${JSON.stringify(got)}` +
    (ok ? "" : `  (expected ${JSON.stringify(expected)}, opened=${opened}) ${errors.join(" | ")}`));
}
// Plugin disabled + re-enabled without restarting Obsidian: the bundle loads a second time while
// <math-field> is still registered to the first load's class.
fs.writeFileSync(path.join(dist, "session-twice.html"), '<!doctype html><meta charset="utf-8"><body>' +
  '<script src="session-harness.js"></script><script src="session-harness.js"></script></body>');
await page.goto("file:///" + path.join(dist, "session-twice.html").replace(/\\/g, "/"));
await page.evaluate(() => window.setDoc("ab", 1));
const reopened = await page.evaluate(() => window.open(1, 1, false, "", false));
await page.waitForTimeout(100);
await page.keyboard.type("x", { delay: 10 });
await page.keyboard.press("Escape");
await page.waitForTimeout(100);
const reloadDoc = await page.evaluate(() => window.docText());
const reloadErrors = await page.evaluate(() => window.errors.splice(0));
const reloadOk = reopened && reloadDoc === "a$x$b" && reloadErrors.length === 0;
if (!reloadOk) failed++;
console.log(`${reloadOk ? "PASS" : "FAIL"}  works after plugin reload: ${JSON.stringify(reloadDoc)} ${reloadErrors.join(" | ")}`);

// Click-to-edit. [name, doc, live preview?, nth .math to click, keys, expected doc, editor opened?, raw notices]
const CLICKS = [
  ["click old formula, Esc without edits keeps its text", "a $\\frac12$ b", true, 0, ["Escape"], "a $\\frac12$ b", true, 0],
  ["click old formula and edit it", "a $\\frac12$ b", true, 0, ["+", "1", "Escape"], "a $\\frac{1}{2}+1$ b", true, 0],
  ["click second formula", "$x$ and $y$", true, 1, ["2", "Escape"], "$x$ and $y2$", true, 0],
  ["click numbered display keeps its number", "$$\nx \\tag{1}\n$$", true, 0, ["+", "y", "Escape"],
    "$$\nx+y \\tag{1}\n$$", true, 0],
  ["click formula wrapped onto two source lines: editor, Esc keeps its text",
    "using:\n$$\nM^{*}(s)=argmin_{m\\geq0} <[D_{func}(G,G'|s)]^{2}>_{G,G'}\n+\\alpha ||M||_{2} \\tag{1}\n$$", true, 0,
    ["Escape"], "using:\n$$\nM^{*}(s)=argmin_{m\\geq0} <[D_{func}(G,G'|s)]^{2}>_{G,G'}\n+\\alpha ||M||_{2} \\tag{1}\n$$",
    true, 0],
  ["click inline math with \\tag: raw text", "$x \\tag{3}$", true, 0, [], "$x \\tag{3}$", false, 1],
  ["click aligned block: raw text, untouched", "$$\n\\begin{aligned}a&=b\\end{aligned}\n$$", true, 0, [],
    "$$\n\\begin{aligned}a&=b\\end{aligned}\n$$", false, 1],
];
for (const [name, doc, lp, nth, keys, expected, expectEditing, expectRaw] of CLICKS) {
  await page.evaluate(([d, l]) => window.setDoc(d, 0, l), [doc, lp]);
  await page.locator(".math").nth(nth).click();
  await page.waitForTimeout(100);
  const editing = await page.evaluate(() => window.editing());
  for (const k of keys) {
    if (/^[A-Z][a-zA-Z]+$/.test(k)) await page.keyboard.press(k);
    else await page.keyboard.type(k, { delay: 10 });
  }
  await page.waitForTimeout(100);
  const got = await page.evaluate(() => window.docText());
  const raw = await page.evaluate(() => window.rawNotices);
  const errors = await page.evaluate(() => window.errors.splice(0));
  const ok = got === expected && editing === expectEditing && raw === expectRaw && errors.length === 0;
  total++;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${JSON.stringify(got)}` +
    (ok ? "" : `  (expected ${JSON.stringify(expected)}; editing=${editing} raw=${raw}) ${errors.join(" | ")}`));
}
// Steps: ["click", nth] | ["open", from, to, display, initial] | ["keys", ...] | ["eval", fn, ...args]
// [name, doc, live preview?, steps, expected doc, expected lost formulas]
const FLOWS = [
  ["edit one formula, then click another", "$\\frac12$ and $y$", true,
    [["click", 0], ["keys", "+", "x"], ["click", 0], ["keys", "2", "Escape"]], "$\\frac{1}{2}+x$ and $y2$", []],
  ["open another formula from its old position while editing", "$\\frac12$ and $y$", false,
    [["open", 0, 9, false, "\\frac12"], ["keys", "+", "x"], ["open", 14, 17, false, "y"], ["keys", "2", "Escape"]],
    "$\\frac{1}{2}+x$ and $y2$", []],
  ["text added right after the formula from outside is kept", "$x$b", false,
    [["open", 0, 3, false, "x"], ["eval", "externalChange", 3, 3, "Q"], ["keys", "2", "Escape"]], "$x2$Qb", []],
  ["formula changed from outside: not overwritten, kept for the user", "$x$b", false,
    [["open", 0, 3, false, "x"], ["eval", "externalChange", 1, 2, "z"], ["keys", "2", "Escape"]], "$z$b", ["x2"]],
  ["another note loaded while editing: untouched", "$x$b", false,
    [["open", 0, 3, false, "x"], ["keys", "2"], ["eval", "replaceState", "other note"], ["keys", "Escape"]],
    "other note", ["x2"]],
  ["panel button right after opening: cursor in the first box", "ab", false,
    [["open", 1, 1, false, ""], ["eval", "insertTemplate", "\\frac{#?}{#?}"], ["keys", "1", "Tab", "2", "Escape"]],
    "a$\\frac{1}{2}$b", []],
];
for (const [name, doc, lp, steps, expected, expectLost] of FLOWS) {
  await page.evaluate(([d, l]) => { window.setDoc(d, 0, l); window.lost = []; }, [doc, lp]);
  for (const [kind, ...args] of steps) {
    if (kind === "click") await page.locator(".math").nth(args[0]).click();
    else if (kind === "open") await page.evaluate((a) => window.open(a[0], a[1], a[2], a[3], false), args);
    else if (kind === "eval") await page.evaluate(([f, ...a]) => window[f](...a), args);
    else for (const k of args) {
      if (/^[A-Z][a-zA-Z]+$/.test(k)) await page.keyboard.press(k);
      else await page.keyboard.type(k, { delay: 10 });
    }
    await page.waitForTimeout(100);
  }
  const got = await page.evaluate(() => window.docText());
  const lost = await page.evaluate(() => window.lost);
  const errors = await page.evaluate(() => window.errors.splice(0));
  const ok = got === expected && JSON.stringify(lost) === JSON.stringify(expectLost) && errors.length === 0;
  total++;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${JSON.stringify(got)}` +
    (ok ? "" : `  (expected ${JSON.stringify(expected)}; lost=${JSON.stringify(lost)}) ${errors.join(" | ")}`));
}
// Tab closed while editing: the formula is reported, the editor is closed
await page.evaluate(() => { window.setDoc("ab", 1); window.lost = []; window.open(1, 1, false, "", false); });
await page.waitForTimeout(100);
await page.keyboard.type("q", { delay: 10 });
await page.evaluate(() => window.destroyView());
const closedOk = await page.evaluate(() => !window.editing() && JSON.stringify(window.lost) === '["q"]');
total++;
if (!closedOk) failed++;
console.log(`${closedOk ? "PASS" : "FAIL"}  tab closed while editing: formula kept for the user, editor closed`);

// Source mode: clicking the formula text just places the cursor
await page.evaluate(() => window.setDoc("a $x$ b", 0, false));
await page.locator(".cm-content").click({ position: { x: 30, y: 5 } });
await page.waitForTimeout(100);
const sourceOk = !(await page.evaluate(() => window.editing()));
total++;
if (!sourceOk) failed++;
console.log(`${sourceOk ? "PASS" : "FAIL"}  source mode click does not open the editor`);

await browser.close();
console.log(`${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);
