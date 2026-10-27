import { ItemView, WorkspaceLeaf } from "obsidian";
import { convertLatexToMarkup } from "mathlive";
import { filterSymbols, SYMBOL_GROUPS } from "./symbols";

export const VIEW_TYPE_FORMULA_PANEL = "lyx-math-formula-panel";

// Right-sidebar panel of rendered symbol buttons; clicking one hands its LaTeX ("#?" = empty box)
// to `insert`.
export class FormulaPanelView extends ItemView {
  private groupsEl!: HTMLElement;

  constructor(leaf: WorkspaceLeaf, private readonly insert: (latex: string) => void) {
    super(leaf);
  }

  getViewType(): string { return VIEW_TYPE_FORMULA_PANEL; }
  getDisplayText(): string { return "LyX formula panel"; }
  getIcon(): string { return "sigma"; }

  async onOpen(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    root.addClass("lyx-math-panel");
    const search = root.createEl("input", { type: "search", placeholder: "Search (e.g. frac, alpha, arrow)" });
    search.addClass("lyx-math-panel-search");
    this.groupsEl = root.createDiv();
    search.addEventListener("input", () => this.render(search.value));
    this.render("");
  }

  private render(query: string): void {
    this.groupsEl.empty();
    for (const group of filterSymbols(SYMBOL_GROUPS, query)) {
      const details = this.groupsEl.createEl("details", { attr: { open: "" } });
      details.createEl("summary", { text: group.name });
      const box = details.createDiv({ cls: "lyx-math-panel-buttons" });
      for (const latex of group.items) {
        const button = box.createDiv({ cls: "lyx-math-panel-button", attr: { "aria-label": latex.replace(/#\?/g, "□") } });
        button.innerHTML = convertLatexToMarkup(latex.replace(/#\?/g, "\\square"));
        // keep focus in the math editor
        button.addEventListener("mousedown", (e) => e.preventDefault());
        button.addEventListener("click", () => this.insert(latex));
      }
    }
  }
}
