import { Plugin } from "obsidian";

export default class LyxMathPlugin extends Plugin {
  async onload() {
    console.log("LyX Math loaded");
  }
}
