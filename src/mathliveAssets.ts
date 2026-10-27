import { normalizePath, Plugin } from "obsidian";
import { MathfieldElement } from "mathlive";
import fontsCss from "mathlive/fonts.css";
import staticCss from "mathlive/static.css";

// Point MathLive at the fonts shipped in the plugin folder (no CDN) and load the stylesheets
// needed to lay out formulas rendered outside a math-field (formula panel buttons).
export function initMathLiveAssets(plugin: Plugin): void {
  const dir = normalizePath(`${plugin.manifest.dir}/fonts`);
  // getResourcePath adds a cache-busting query; file names are appended after the directory
  const fontsUrl = plugin.app.vault.adapter.getResourcePath(dir).replace(/\?.*$/, "");
  MathfieldElement.fontsDirectory = fontsUrl;
  MathfieldElement.soundsDirectory = null;

  const style = document.createElement("style");
  style.id = "lyx-math-mathlive-css";
  style.textContent = fontsCss.replace(/url\(fonts\//g, `url(${fontsUrl}/`) + "\n" + staticCss;
  document.head.appendChild(style);
  plugin.register(() => style.remove());
}
