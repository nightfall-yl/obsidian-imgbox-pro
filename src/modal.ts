import { App, Modal } from "obsidian";
import { APP_NAME } from "./config";
import LocalImagesPlugin from "./main";
import { isChineseDisplayLanguage } from "./previewHelpers";

export class ModalW1 extends Modal {
  plugin: LocalImagesPlugin;
  messg: string = "";
  callbackFunc: (() => void) | (() => Promise<unknown>) = null;

  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let { contentEl, titleEl } = this;
    titleEl.setText(APP_NAME);
    contentEl.createDiv({
      text: this.messg,
    });

    contentEl
      .createEl("button", {
        cls: ["mod-cta"],
        text: isChineseDisplayLanguage() ? "取消" : "Cancel",
      })
      .addEventListener("click", () => {
        this.close();
      });

    contentEl
      .createEl("button", {
        cls: ["mod-cta"],
        text: isChineseDisplayLanguage() ? "确认" : "Confirm",
      })
      .addEventListener("click", () => {
        this.close();

        if (this.callbackFunc) {
          void this.callbackFunc();
        }
      });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}

export class ModalW2 extends Modal {
  plugin: LocalImagesPlugin;
  messg: string = "";

  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let { contentEl, titleEl } = this;
    titleEl.setText(APP_NAME);
    contentEl.createDiv({
      text: this.messg,
    });

    contentEl
      .createEl("button", {
        cls: ["mod-cta"],
        text: isChineseDisplayLanguage() ? "确定" : "OK",
      })
      .addEventListener("click", () => {
        this.close();
      });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
