// Manual check in the real Obsidian: start Obsidian with --remote-debugging-port=9222, then
//   node e2e/obsidian-probe.mjs click block|inline [text to type]   (logs what happens after a click)
//   node e2e/obsidian-probe.mjs cleanup                         (deletes the test note)
// It creates lyx-flicker-test.md in the open vault.
import { chromium } from "playwright-core";

const NOTE = "lyx-flicker-test.md";
const TEXT = "using:\n$$\nM^{*}(s)=argmin_{m\\geq0} <[D_{func}(G,G'|s)-\\Delta g^{T} \\cdot M \\cdot \\Delta g]^{2}>_{G,G'}\n+\\alpha ||M||_{2} \\tag{1}\n$$\nafter\n\ninline $x^2+1$ here\n";
const mode = process.argv[2] ?? "click";
const which = process.argv[3] ?? "block";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().startsWith("app://"));
page.on("console", (m) => { if (m.text().startsWith("[probe]")) console.log(m.text()); });

await page.evaluate(async ({ NOTE, TEXT }) => {
  const app = window.app;
  let file = app.vault.getAbstractFileByPath(NOTE);
  if (file) await app.vault.modify(file, TEXT); else file = await app.vault.create(NOTE, TEXT);
  const leaf = app.workspace.getLeaf(false);
  await leaf.openFile(file, { state: { mode: "source", source: false } });
}, { NOTE, TEXT });
await page.waitForTimeout(800);

if (mode === "cleanup") {
  await page.evaluate(async (NOTE) => {
    const f = window.app.vault.getAbstractFileByPath(NOTE);
    window.app.workspace.getLeaf(false).detach?.();
    if (f) await window.app.vault.delete(f);
  }, NOTE);
  await browser.close();
  process.exit(0);
}

// timeline of what is on screen
await page.evaluate(() => {
  const t0 = performance.now();
  const log = (s) => console.log(`[probe] ${Math.round(performance.now() - t0)}ms ${s}`);
  const state = () => {
    const mf = document.querySelector(".workspace-leaf.mod-active math-field");
    const cm = window.app.workspace.activeEditor?.editor;
    const sel = cm ? JSON.stringify(cm.getCursor()) : "-";
    const blocks = document.querySelectorAll(".workspace-leaf.mod-active .cm-content .math").length;
    return `field=${!!mf} active=${document.activeElement?.tagName.toLowerCase()}.${document.activeElement?.className?.toString().slice(0, 20)} cursor=${sel} rendered=${blocks}`;
  };
  let last = "";
  window.__probe = setInterval(() => { const s = state(); if (s !== last) { log(s); last = s; } }, 10);
  for (const ev of ["mousedown", "mouseup", "click", "dblclick"])
    document.addEventListener(ev, (e) => log(`${ev} on ${e.target.tagName.toLowerCase()}.${String(e.target.className).slice(0, 30)} prevented=${e.defaultPrevented}`), true);
  document.addEventListener("focusin", (e) => log(`focusin ${e.target.tagName.toLowerCase()}`), true);
  document.addEventListener("focusout", (e) => log(`focusout ${e.target.tagName.toLowerCase()}`), true);
});

const sel = which === "block" ? ".workspace-leaf.mod-active .cm-content .math.math-block" : ".workspace-leaf.mod-active .cm-content .math:not(.math-block)";
const box = await page.locator(sel).first().boundingBox();
console.log("target box", JSON.stringify(box));
await page.mouse.move(box.x + box.width / 3, box.y + box.height / 2);
await page.mouse.down();
await page.waitForTimeout(80);
await page.mouse.up();
await page.waitForTimeout(1500);
await page.evaluate(() => clearInterval(window.__probe));
if (process.argv[4]) await page.keyboard.type(process.argv[4], { delay: 20 });
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
console.log("note now:", JSON.stringify(await page.evaluate(() => window.app.workspace.activeEditor.editor.getValue())));
await browser.close();
