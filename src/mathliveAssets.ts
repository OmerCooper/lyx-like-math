import { MathfieldElement } from "mathlive";
import { registeredMathfield } from "./editor/mathField";

// MathLive's fonts and layout CSS come with the plugin's styles.css (fonts embedded, see
// scripts/styles.mjs), so MathLive must not fetch fonts or sounds itself.
export function initMathLiveAssets(): void {
  for (const cls of new Set([MathfieldElement, registeredMathfield()])) {
    cls.fontsDirectory = null;
    cls.soundsDirectory = null;
  }
}
