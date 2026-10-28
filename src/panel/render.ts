import { convertLatexToMarkup } from "mathlive";
import { EXTRA_MACROS } from "../latex/macros";

// A panel button's picture: empty boxes ("#?") drawn as squares.
export function buttonMarkup(latex: string): string {
  return convertLatexToMarkup(latex.replace(/#\?/g, "\\square"), { macros: EXTRA_MACROS });
}
