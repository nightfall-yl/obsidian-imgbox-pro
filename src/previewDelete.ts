import { Notice, TFile, TFolder } from "obsidian";
import type { PreviewHost } from "./previewUtil";

const SUCCESS_NOTICE_TIMEOUT = 1800;

export const deleteFile = async (file: TFile | TFolder, plugin: PreviewHost) => {
  try {
    await plugin.app.fileManager.trashFile(file);
  } catch (error) {
    console.error(error);
    new Notice("删除文件或文件夹失败！", SUCCESS_NOTICE_TIMEOUT);
  }
};
