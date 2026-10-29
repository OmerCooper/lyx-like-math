import { App, Plugin, PluginSettingTab, Setting, SettingDefinitionItem } from "obsidian";

export interface LyxMathSettings {
  // a formula that couldn't be written back (its note changed or closed) goes to the clipboard
  copyUnsavedToClipboard: boolean;
}

export const DEFAULT_SETTINGS: LyxMathSettings = {
  copyUnsavedToClipboard: true,
};

const COPY_NAME = "Copy unsaved formulas to the clipboard";
const COPY_DESC = "If the note changes while you are editing a formula (synced, or its tab closed), the formula " +
  "can't be saved into it. It is always shown in a message; with this on, it is also copied to the " +
  "clipboard so you can paste it back. The plugin never reads the clipboard.";

export class LyxMathSettingTab extends PluginSettingTab {
  constructor(app: App, plugin: Plugin, private settings: LyxMathSettings, private save: () => Promise<void>) {
    super(app, plugin);
  }

  // Obsidian 1.13+: drawn by Obsidian and found by its settings search
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [{
      name: COPY_NAME,
      desc: COPY_DESC,
      aliases: ["clipboard"],
      control: { type: "toggle", key: "copyUnsavedToClipboard", defaultValue: DEFAULT_SETTINGS.copyUnsavedToClipboard },
    }];
  }

  getControlValue(key: string): unknown {
    return this.settings[key as keyof LyxMathSettings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key === "copyUnsavedToClipboard") this.settings.copyUnsavedToClipboard = value === true;
    await this.save();
  }

  // Obsidian before 1.13 (not called when getSettingDefinitions is used)
  display(): void {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName(COPY_NAME)
      .setDesc(COPY_DESC)
      .addToggle((toggle) => toggle.setValue(this.settings.copyUnsavedToClipboard).onChange(async (value) => {
        await this.setControlValue("copyUnsavedToClipboard", value);
      }));
  }
}
