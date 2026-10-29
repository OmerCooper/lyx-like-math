import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

export interface LyxMathSettings {
  // a formula that couldn't be written back (its note changed or closed) goes to the clipboard
  copyUnsavedToClipboard: boolean;
}

export const DEFAULT_SETTINGS: LyxMathSettings = {
  copyUnsavedToClipboard: true,
};

export class LyxMathSettingTab extends PluginSettingTab {
  constructor(app: App, plugin: Plugin, private settings: LyxMathSettings, private save: () => Promise<void>) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName("Copy unsaved formulas to the clipboard")
      .setDesc("If the note changes while you are editing a formula (synced, or its tab closed), the formula " +
        "can't be saved into it. It is always shown in a message; with this on, it is also copied to the " +
        "clipboard so you can paste it back. The plugin never reads the clipboard.")
      .addToggle((toggle) => toggle.setValue(this.settings.copyUnsavedToClipboard).onChange(async (value) => {
        this.settings.copyUnsavedToClipboard = value;
        await this.save();
      }));
  }
}
