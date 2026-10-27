import { Menu } from "obsidian";
import type { EditorView } from "@codemirror/view";

// Ctrl+Shift+M menu at the cursor. Resolves true (numbered), false (plain) or null (cancelled).
// `current` checks the existing equation's choice, if there is one.
export function showDisplayMenu(view: EditorView, current: boolean | null): Promise<boolean | null> {
  return new Promise((resolve) => {
    let choice: boolean | null = null;
    const menu = new Menu();
    menu.addItem((item) => item.setTitle("Display math").setIcon("sigma")
      .setChecked(current === false).onClick(() => { choice = false; }));
    menu.addItem((item) => item.setTitle("Numbered display math").setIcon("list-ordered")
      .setChecked(current === true).onClick(() => { choice = true; }));
    // Resolve only once the menu is gone and Obsidian has put focus back in the note;
    // opening the math editor earlier loses its focus to the note, which closes it again.
    menu.onHide(() => requestAnimationFrame(() => setTimeout(() => resolve(choice), 0)));
    const at = view.coordsAtPos(view.state.selection.main.head);
    menu.showAtPosition({ x: at?.left ?? 0, y: at?.bottom ?? 0 });
    // highlight the first option so Enter picks plain display math (Menu.select is not public API)
    (menu as unknown as { select?: (i: number) => void }).select?.(0);
  });
}
