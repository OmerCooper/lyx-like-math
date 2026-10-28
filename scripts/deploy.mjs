// Copy the built plugin into your vault's plugin folder.
// The folder comes from LYX_MATH_TARGET, or from deploy-target.txt (one line, git-ignored), e.g.
//   C:\path\to\MyVault\.obsidian\plugins\lyx-like-math
import fs from "fs";
import path from "path";

const target = process.env.LYX_MATH_TARGET ??
  (fs.existsSync("deploy-target.txt") ? fs.readFileSync("deploy-target.txt", "utf8").trim() : "");
if (!target) {
  console.error("No deploy folder: set LYX_MATH_TARGET or write it to deploy-target.txt");
  process.exit(1);
}

fs.mkdirSync(target, { recursive: true });
for (const f of ["main.js", "manifest.json", "styles.css"]) {
  fs.copyFileSync(f, path.join(target, f));
}
console.log(`Deployed to ${target}`);
