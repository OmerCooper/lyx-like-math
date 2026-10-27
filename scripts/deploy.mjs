// Copy the built plugin into the Lab Vault plugin folder.
import fs from "fs";
import path from "path";

const target = process.env.LYX_MATH_TARGET ??
  "<your vault>/.obsidian/plugins/";

fs.mkdirSync(target, { recursive: true });
for (const f of ["main.js", "manifest.json", "styles.css"]) {
  fs.copyFileSync(f, path.join(target, f));
}
fs.cpSync("node_modules/mathlive/dist/fonts", path.join(target, "fonts"), { recursive: true });
console.log(`Deployed to ${target}`);
