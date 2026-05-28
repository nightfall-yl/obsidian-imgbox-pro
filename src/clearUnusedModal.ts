import { App, Modal, TFile } from "obsidian";
import { isChineseDisplayLanguage } from "./previewHelpers";

export class ClearUnusedLogsModal extends Modal {
  title: string;
  textToView: string;

  constructor(title: string, textToView: string, app: App) {
    super(app);
    this.title = title;
    this.textToView = textToView;
  }

  onOpen() {
    const { contentEl } = this;

    const headerWrapper = contentEl.createEl("div");
    headerWrapper.addClass("unused-images-center-wrapper");
    const headerEl = headerWrapper.createEl("h1", { text: this.title });
    headerEl.addClass("modal-title");

    const logs = contentEl.createEl("div");
    logs.addClass("unused-images-logs");
    logs.innerHTML = this.textToView;

    const buttonWrapper = contentEl.createEl("div");
    buttonWrapper.addClass("unused-images-center-wrapper");
    const closeButton = buttonWrapper.createEl("button", {
      text: isChineseDisplayLanguage() ? "关闭" : "Close",
    });
    closeButton.addClass("unused-images-button");
    closeButton.addEventListener("click", () => {
      this.close();
    });
  }
}

export class ClearUnusedPreviewModal extends Modal {
  title: string;
  description: string;
  files: TFile[];
  onConfirm: () => Promise<void> | void;

  constructor(title: string, description: string, files: TFile[], onConfirm: () => Promise<void> | void, app: App) {
    super(app);
    this.title = title;
    this.description = description;
    this.files = files;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;

    const headerWrapper = contentEl.createEl("div");
    headerWrapper.addClass("unused-images-center-wrapper");
    const headerEl = headerWrapper.createEl("h1", { text: this.title });
    headerEl.addClass("modal-title");

    contentEl.createDiv({
      text: this.description,
      cls: "unused-images-preview-summary",
    });

    const countEl = contentEl.createDiv({ cls: "unused-images-preview-count" });
    countEl.setText(
      isChineseDisplayLanguage()
        ? `共扫描到 ${this.files.length} 个未使用文件。`
        : `Found ${this.files.length} unused file(s).`
    );

    const listWrapper = contentEl.createDiv({ cls: "unused-images-preview-list" });
    const previewCount = Math.min(this.files.length, 80);
    for (let i = 0; i < previewCount; i++) {
      listWrapper.createDiv({
        text: this.files[i].path,
        cls: "unused-images-preview-item",
      });
    }
    if (this.files.length > previewCount) {
      listWrapper.createDiv({
        text: isChineseDisplayLanguage()
          ? `…… 还有 ${this.files.length - previewCount} 个文件未显示。`
          : `... ${this.files.length - previewCount} more file(s) not shown.`,
        cls: "unused-images-preview-more",
      });
    }

    const buttonWrapper = contentEl.createDiv();
    buttonWrapper.addClass("unused-images-center-wrapper");

    const cancelButton = buttonWrapper.createEl("button", {
      text: isChineseDisplayLanguage() ? "取消" : "Cancel",
    });
    cancelButton.addClass("mod-cta");
    cancelButton.addClass("unused-images-button");
    cancelButton.addEventListener("click", () => {
      this.close();
    });

    const confirmButton = buttonWrapper.createEl("button", {
      text: isChineseDisplayLanguage() ? "确认删除" : "Confirm delete",
    });
    confirmButton.addClass("mod-cta");
    confirmButton.addClass("unused-images-button");
    confirmButton.addClass("mod-warning");
    confirmButton.addEventListener("click", async () => {
      this.close();
      await this.onConfirm();
    });
  }
}
