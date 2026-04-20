import { Notice, TFile, TFolder } from "obsidian";
import type { PreviewHost } from "./previewUtil";

const SUCCESS_NOTICE_TIMEOUT = 1800;

export const deleteFile = async (file: TFile | TFolder, plugin: PreviewHost) => {
  const deleteOption = plugin.settings.deleteDestination;
  try {
    if (deleteOption === ".trash") {
      await plugin.app.vault.trash(file, false);
    } else if (deleteOption === "system-trash") {
      await plugin.app.vault.trash(file, true);
    } else if (deleteOption === "permanent") {
      await plugin.app.vault.delete(file);
    }
  } catch (error) {
    console.error(error);
    new Notice("删除文件或文件夹失败！", SUCCESS_NOTICE_TIMEOUT);
  }
};
