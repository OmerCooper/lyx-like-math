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
  ["numbered between two", "$$\na \\tag{1}\n$$\n\n$$\nb \\tag{2}\n$$", 15, true, true, ["c", "Escape"],
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
await browser.close();
console.log(`${CASES.length - failed}/${CASES.length} passed`);
process.exit(failed ? 1 : 0);
