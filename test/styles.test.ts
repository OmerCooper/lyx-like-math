import fs from "fs";
import { buildStyles, inlineFonts } from "../scripts/styles.mjs";

describe("styles.css build (community install ships only main.js, manifest.json, styles.css)", () => {
  it("inlines each font url as a woff2 data url", () => {
    const css = "@font-face{src:url(fonts/A-Regular.woff2) format(\"woff2\")}@font-face{src:url(fonts/B.woff2)}";
    const out = inlineFonts(css, (name: string) => Buffer.from(`bytes of ${name}`));
    expect(out).toBe(
      "@font-face{src:url(data:font/woff2;base64," + Buffer.from("bytes of A-Regular.woff2").toString("base64") +
        ") format(\"woff2\")}@font-face{src:url(data:font/woff2;base64," +
        Buffer.from("bytes of B.woff2").toString("base64") + ")}",
    );
  });

  it("builds one stylesheet: all 20 MathLive fonts embedded, MathLive layout CSS, the plugin's own CSS", () => {
    const css: string = buildStyles();
    expect(css).not.toMatch(/url\(fonts\//);
    expect(css.match(/url\(data:font\/woff2;base64,/g)?.length).toBe(20);
    expect(css).toContain(".ML__");
    expect(css).toContain(fs.readFileSync("src/styles.css", "utf8").trim());
  });
});
