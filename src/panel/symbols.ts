// Formula panel buttons, grouped like LyX's math toolbar. "#?" marks an empty box.
export interface SymbolGroup {
  name: string;
  items: string[];
  actions?: PanelAction[];
}

// A button that edits the formula instead of inserting LaTeX.
export interface PanelAction {
  label: string;
  tooltip: string;
  command: "addRowAfter" | "addColumnAfter";
}

export const SYMBOL_GROUPS: SymbolGroup[] = [
  { name: "Fractions & roots", items: ["\\frac{#?}{#?}", "\\sqrt{#?}", "\\sqrt[#?]{#?}", "\\binom{#?}{#?}", "#?^{#?}", "#?_{#?}", "#?_{#?}^{#?}"] },
  { name: "Accents", items: ["\\hat{#?}", "\\bar{#?}", "\\vec{#?}", "\\dot{#?}", "\\ddot{#?}", "\\tilde{#?}", "\\overline{#?}", "\\underline{#?}", "\\widehat{#?}", "\\overrightarrow{#?}"] },
  { name: "Greek", items: ["\\alpha", "\\beta", "\\gamma", "\\delta", "\\epsilon", "\\varepsilon", "\\zeta", "\\eta", "\\theta", "\\vartheta", "\\iota", "\\kappa", "\\lambda", "\\mu", "\\nu", "\\xi", "\\pi", "\\rho", "\\sigma", "\\tau", "\\upsilon", "\\phi", "\\varphi", "\\chi", "\\psi", "\\omega",
    "\\Gamma", "\\Delta", "\\Theta", "\\Lambda", "\\Xi", "\\Pi", "\\Sigma", "\\Upsilon", "\\Phi", "\\Psi", "\\Omega"] },
  { name: "Operators", items: ["\\pm", "\\mp", "\\times", "\\div", "\\cdot", "\\circ", "\\ast", "\\star", "\\cap", "\\cup", "\\wedge", "\\vee", "\\oplus", "\\otimes", "\\nabla", "\\partial"] },
  { name: "Relations", items: ["\\leq", "\\geq", "\\neq", "\\approx", "\\equiv", "\\sim", "\\simeq", "\\cong", "\\propto", "\\ll", "\\gg", "\\in", "\\notin", "\\subset", "\\subseteq", "\\supset", "\\perp", "\\parallel"] },
  { name: "Arrows", items: ["\\to", "\\leftarrow", "\\leftrightarrow", "\\Rightarrow", "\\Leftarrow", "\\Leftrightarrow", "\\mapsto", "\\uparrow", "\\downarrow", "\\longrightarrow", "\\rightleftharpoons"] },
  { name: "Big operators", items: ["\\sum_{#?}^{#?}", "\\prod_{#?}^{#?}", "\\int_{#?}^{#?}", "\\iint", "\\oint", "\\lim_{#?}", "\\bigcup_{#?}", "\\bigcap_{#?}"] },
  { name: "Delimiters", items: ["\\left(#?\\right)", "\\left[#?\\right]", "\\left\\{#?\\right\\}", "\\left|#?\\right|", "\\left\\|#?\\right\\|", "\\left\\langle#?\\right\\rangle", "\\left\\lfloor#?\\right\\rfloor", "\\left\\lceil#?\\right\\rceil"] },
  // Ctrl+Enter adds a row, Ctrl+Shift+Enter a column
  { name: "Matrices", items: [
    "\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}", "\\begin{bmatrix}#?&#?\\\\#?&#?\\end{bmatrix}",
    "\\begin{vmatrix}#?&#?\\\\#?&#?\\end{vmatrix}", "\\begin{Bmatrix}#?&#?\\\\#?&#?\\end{Bmatrix}",
    "\\begin{Vmatrix}#?&#?\\\\#?&#?\\end{Vmatrix}", "\\begin{matrix}#?&#?\\\\#?&#?\\end{matrix}",
    "\\begin{pmatrix}#?&#?&#?\\\\#?&#?&#?\\\\#?&#?&#?\\end{pmatrix}",
    "\\begin{bmatrix}#?&#?&#?\\\\#?&#?&#?\\\\#?&#?&#?\\end{bmatrix}",
    "\\begin{pmatrix}#?\\\\#?\\end{pmatrix}", "\\begin{pmatrix}#?\\\\#?\\\\#?\\end{pmatrix}",
  ], actions: [
    { label: "+ row", tooltip: "Add a row below (Ctrl+Enter)", command: "addRowAfter" },
    { label: "+ column", tooltip: "Add a column to the right (Ctrl+Shift+Enter)", command: "addColumnAfter" },
  ] },
  { name: "Functions", items: ["\\sin", "\\cos", "\\tan", "\\arcsin", "\\arccos", "\\arctan", "\\sinh", "\\cosh", "\\log", "\\ln", "\\exp", "\\max", "\\min", "\\det", "\\dim", "\\ker"] },
  { name: "Misc", items: ["\\infty", "\\hbar", "\\ell", "\\forall", "\\exists", "\\emptyset", "\\Re", "\\Im", "\\aleph", "\\angle", "\\degree", "\\dots", "\\cdots", "\\vdots", "\\ddots", "\\prime"] },
];

// Case-insensitive, "\" optional. A query matching a group's name keeps the whole group.
export function filterSymbols(groups: SymbolGroup[], query: string): SymbolGroup[] {
  const q = query.toLowerCase().replace(/\\/g, "").trim();
  if (!q) return groups;
  const hits: SymbolGroup[] = [];
  for (const g of groups) {
    const whole = g.name.toLowerCase().includes(q);
    const items = whole ? g.items : g.items.filter((i) => i.toLowerCase().replace(/\\/g, "").includes(q));
    const actions = whole ? g.actions : g.actions?.filter((a) => a.label.toLowerCase().includes(q));
    if (items.length || actions?.length) hits.push({ name: g.name, items, ...(actions?.length ? { actions } : {}) });
  }
  return hits;
}
