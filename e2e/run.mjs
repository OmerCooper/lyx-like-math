// Types into a real MathLive field (configured as in the plugin) in a local Chrome/Edge and
// checks the resulting LaTeX. Run: npm run e2e
import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { chromium } from "playwright-core";

const BROWSERS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const PMATRIX = "\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}";

// "@latex" = click a formula panel button
// [name, keys to type (Playwright key names or text), expected saved LaTeX]
export const CASES = [
  ["frac space", ["\\frac", "Space", "4", "Tab", "3"], "\\frac{4}{3}"],
  ["Delta space", ["\\Delta", "Space", "x"], "\\Delta x"],
  ["cdot space", ["a", "\\cdot", "Space", "b"], "a\\cdot b"],
  ["sqrt keeps everything until Space", ["\\sqrt", "4", "*", "5"], "\\sqrt{4*5}"],
  ["sqrt Space then contents", ["\\sqrt", "Space", "4", "+", "5"], "\\sqrt{4+5}"],
  ["Space leaves the sqrt", ["\\sqrt", "Space", "4", "Space", "+", "1"], "\\sqrt{4}+1"],
  ["hat keeps contents", ["\\hat", "Space", "x", "y"], "\\hat{xy}"],
  ["Tab leaves the sqrt", ["\\sqrt", "4", "*", "5", "Tab", "+", "1"], "\\sqrt{4*5}+1"],
  ["command inside sqrt", ["\\sqrt", "\\alpha", "Space", "x", "Space", "+"], "\\sqrt{\\alpha x}+"],
  ["command into empty frac box", ["\\frac", "Space", "\\alpha", "Space", "Tab", "2"], "\\frac{\\alpha}{2}"],
  ["Tab in filled frac goes to denominator then out", ["\\frac", "1", "Tab", "2", "Tab", "+"], "\\frac{1}{2}+"],
  ["frac digit goes into numerator", ["\\frac", "1", "2", "Tab", "3"], "\\frac{12}{3}"],
  ["alpha stays letters", ["alpha"], "alpha"],
  ["slash is not a fraction", ["a", "/", "b"], "a/b"],
  ["paren not auto-paired", ["(", "a"], "(a"],
  ["matrix: Tab goes cell to cell", ["@" + PMATRIX, "a", "Tab", "b", "Tab", "c", "Tab", "d"],
    "\\begin{pmatrix}a & b\\\\ c & d\\end{pmatrix}"],
  ["matrix: Tab after the last cell leaves it", ["@" + PMATRIX, "a", "Tab", "b", "Tab", "c", "Tab", "d", "Tab", "+"],
    "\\begin{pmatrix}a & b\\\\ c & d\\end{pmatrix}+"],
  ["matrix: Ctrl+Enter adds a row", ["@" + PMATRIX, "a", "Tab", "b", "Tab", "c", "Tab", "d", "Control+Enter", "e"],
    "\\begin{pmatrix}a & b\\\\ c & d\\\\ e & \\end{pmatrix}"],
  ["matrix: Ctrl+Shift+Enter adds a column", ["@" + PMATRIX, "a", "Control+Shift+Enter", "x"],
    "\\begin{pmatrix}a & x & \\\\  &  & \\end{pmatrix}"],
  ["Ctrl+Enter outside a matrix does nothing", ["a", "Control+Enter", "b"], "ab"],
  ["Ctrl+Shift+Enter outside a matrix does nothing", ["a", "Control+Shift+Enter", "b"], "ab"],
  ["empty box is saved empty", ["\\frac", "1"], "\\frac{1}{}"],
  ["dots shows as dots and is saved as \\dots", ["\\dots", "Space", "!render"], "\\dots"],
  ["Ctrl+Enter handled by Obsidian's keymap adds one row", ["!appKeymap", "@" + PMATRIX, "a", "Control+Enter", "e"],
    "\\begin{pmatrix}a & \\\\ e & \\\\  & \\end{pmatrix}"],
];

const dist = path.resolve("e2e/dist");
fs.mkdirSync(dist, { recursive: true });
await esbuild.build({
  entryPoints: ["e2e/harness.ts"], bundle: true, format: "iife", outfile: path.join(dist, "harness.js"),
  loader: { ".css": "text" }, logLevel: "error",
});
// the plugin's built styles.css (npm run build), as Obsidian loads it
fs.writeFileSync(path.join(dist, "harness.html"), '<!doctype html><meta charset="utf-8">' +
  '<link rel="stylesheet" href="../../styles.css"><body><script src="harness.js"></script></body>');

const executablePath = BROWSERS.find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage();
const fontRequests = [];
page.on("request", (r) => { if (/woff2?$|\/fonts\//.test(r.url())) fontRequests.push(r.url()); });
await page.goto("file:///" + path.join(dist, "harness.html").replace(/\\/g, "/"));

let failed = 0;
for (const [name, keys, expected] of CASES) {
  await page.evaluate(() => window.makeField(false, ""));
  await page.waitForTimeout(50);
  let problem = "";
  for (const k of keys) {
    if (k === "!appKeymap") await page.evaluate(() => window.useAppKeymap());
    else if (k === "!render") { await page.waitForTimeout(50); problem = await page.evaluate(() => window.rawCommandShown()); }
    else if (k.startsWith("@")) await page.evaluate((l) => window.insertLatex(l), k.slice(1));
    else if (/^[A-Z][a-zA-Z+]+$/.test(k) && k !== "Z") await page.keyboard.press(k);
    else await page.keyboard.type(k, { delay: 10 });
  }
  await page.waitForTimeout(50);
  const got = await page.evaluate(() => window.fieldValue());
  const ok = got === expected && !problem;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${JSON.stringify(got)}` +
    (ok ? "" : `  (expected ${JSON.stringify(expected)}) ${problem ? "shows " + problem : ""}`));
}
// every formula panel button renders as math, not as a raw \command
const badButtons = await page.evaluate(() => window.badButtons());
if (badButtons.length) failed++;
console.log(`${badButtons.length ? "FAIL" : "PASS"}  panel buttons render: ${JSON.stringify(badButtons)}`);
// fonts come from styles.css: loaded, and nothing downloaded
const fontsLoaded = await page.evaluate(() => window.mathFontsLoaded());
const fontsOk = fontsLoaded && fontRequests.length === 0;
if (!fontsOk) failed++;
console.log(`${fontsOk ? "PASS" : "FAIL"}  math fonts load from styles.css: loaded=${fontsLoaded} downloads=${JSON.stringify(fontRequests)}`);
await browser.close();
console.log(`${CASES.length + 2 - failed}/${CASES.length + 2} passed`);
process.exit(failed ? 1 : 0);
