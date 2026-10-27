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

await browser.close();
console.log(`${CASES.length + 1 - failed}/${CASES.length + 1} passed`);
process.exit(failed ? 1 : 0);
