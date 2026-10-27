import { Menu } from "obsidian";
import type { EditorView } from "@codemirror/view";

// Ctrl+Shift+M menu at the cursor. Resolves true (numbered), false (plain) or null (cancelled).
// `current` checks the existing equation's choice, if there is one.
export function showDisplayMenu(view: EditorView, current: boolean | null): Promise<boolean | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (choice: boolean | null) => {
      if (done) return;
      done = true;
      resolve(choice);
    };
    const menu = new Menu();
    menu.addItem((item) => item.setTitle("Display math").setIcon("sigma")
      .setChecked(current === false).onClick(() => finish(false)));
    menu.addItem((item) => item.setTitle("Numbered display math").setIcon("list-ordered")
      .setChecked(current === true).onClick(() => finish(true)));
    // hiding fires after a click's handler; on its own it means Esc / click outside
    menu.onHide(() => setTimeout(() => finish(null), 0));
    const at = view.coordsAtPos(view.state.selection.main.head);
    menu.showAtPosition({ x: at?.left ?? 0, y: at?.bottom ?? 0 });
    // highlight the first option so Enter picks plain display math (Menu.select is not public API)
    (menu as unknown as { select?: (i: number) => void }).select?.(0);
  });
}
