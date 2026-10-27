// Debug helper: type keys one at a time and print the field value + cursor after each.
// Usage: node e2e/probe.mjs "\sqrt" Space 4 "*" 5   (run e2e/run.mjs once first to build the harness)
import path from "path";
import { chromium } from "playwright-core";

const keys = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true,
});
const page = await browser.newPage();
page.on("console", (m) => console.log("  console:", m.text()));
await page.goto("file:///" + path.resolve("e2e/dist/harness.html").replace(/\\/g, "/"));
await page.evaluate(() => window.makeField(false, ""));
for (const k of keys) {
  if (/^[A-Z][a-zA-Z]+$/.test(k)) await page.keyboard.press(k);
  else await page.keyboard.type(k, { delay: 10 });
  await page.waitForTimeout(30);
  const s = await page.evaluate(() => {
    const mf = document.querySelector("math-field");
    return { value: mf.value, mode: mf.mode, pos: mf.position, sel: JSON.stringify(mf.selection.ranges),
      withCaret: mf.getValue(0, mf.position) + "|" + mf.getValue(mf.position, mf.lastOffset) };
  });
  console.log(JSON.stringify(k), s);
}
await browser.close();
