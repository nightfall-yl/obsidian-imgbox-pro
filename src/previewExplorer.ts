/**
 * 文件浏览器功能模块
 */

import { TFile } from "obsidian";
import LocalImagesPlugin from "./main";

/**
 * 获取转义后的选择器路径
 * @param filePath 文件路径
 * @returns 转义后的选择器路径
 */
export function getEscapedSelectorPath(filePath: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(filePath);
  }

  return filePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * 清除文件浏览器高亮
 */
export function clearFileExplorerHighlight(): void {
  document
    .querySelectorAll(".af-file-explorer-highlight, .af-file-explorer-highlight-label")
    .forEach((element) => {
      element.classList.remove("af-file-explorer-highlight", "af-file-explorer-highlight-label");
    });
}

/**
 * 清除原生文件浏览器的活动状态
 */
export function clearNativeFileExplorerActiveState(): void {
  document
    .querySelectorAll(
      '.workspace-leaf-content[data-type="file-explorer"] .is-active, .workspace-leaf-content[data-type="file-explorer"] .mod-active'
    )
    .forEach((element) => {
      element.classList.remove("is-active", "mod-active");
    });

  document
    .querySelectorAll('.workspace-leaf-content[data-type="file-explorer"] [aria-selected="true"]')
    .forEach((element) => {
      element.setAttribute("aria-selected", "false");
    });
}

/**
 * 应用文件浏览器高亮
 * @param highlightedExplorerPath 要高亮的文件路径
 */
export function applyFileExplorerHighlight(highlightedExplorerPath: string | null): void {
  clearNativeFileExplorerActiveState();
  clearFileExplorerHighlight();

  if (!highlightedExplorerPath) {
    return;
  }

  const escapedPath = getEscapedSelectorPath(highlightedExplorerPath);
  const candidates = document.querySelectorAll(
    `.workspace-leaf-content[data-type="file-explorer"] [data-path="${escapedPath}"]`
  );

  candidates.forEach((element) => {
    const container = element.closest(".tree-item-self") ?? element;
    container.classList.add("af-file-explorer-highlight");
    if (container instanceof HTMLElement) {
      container.scrollIntoView({ block: "nearest" });
    }

    const label = element.matches(".nav-file-title, .tree-item-self")
      ? element
      : element.querySelector(".nav-file-title") ?? container.querySelector(".nav-file-title");

    label?.classList.add("af-file-explorer-highlight-label");
  });
}

/**
 * 在文件浏览器中定位文件
 * @param plugin 插件实例
 * @param file 要定位的文件
 * @param explorerHighlightSuppressTimer 浏览器高亮抑制计时器
 * @param setExplorerHighlightSuppressTimer 设置浏览器高亮抑制计时器的函数
 * @param setHighlightedExplorerPath 设置高亮浏览器路径的函数
 */
export function locateFileInExplorer(
  plugin: LocalImagesPlugin,
  file: TFile,
  explorerHighlightSuppressTimer: number | null,
  setExplorerHighlightSuppressTimer: (timer: number | null) => void,
  setHighlightedExplorerPath: (path: string | null) => void
): void {
  const abstractFilePath = plugin.app.vault.getAbstractFileByPath(file.path);
  document.body.classList.add("af-suppress-file-explorer-flash");
  if (explorerHighlightSuppressTimer !== null) {
    window.clearTimeout(explorerHighlightSuppressTimer);
  }

  // 使用类型断言访问内部API
  try {
    const appWithInternalApi = plugin.app as unknown as {
      internalPlugins: {
        getEnabledPluginById: (id: string) => { revealInFolder: (file: any) => void };
      };
    };
    appWithInternalApi.internalPlugins
      .getEnabledPluginById("file-explorer")
      .revealInFolder(abstractFilePath);
  } catch (error) {
    console.error("Error revealing file in explorer:", error);
    new (require("obsidian").Notice)("无法在文件浏览器中定位文件");
  }
  setHighlightedExplorerPath(file.path);
  window.requestAnimationFrame(() => {
    clearNativeFileExplorerActiveState();
    applyFileExplorerHighlight(file.path);
  });
  window.setTimeout(() => {
    clearNativeFileExplorerActiveState();
    applyFileExplorerHighlight(file.path);
  }, 24);
  window.setTimeout(() => {
    clearNativeFileExplorerActiveState();
    applyFileExplorerHighlight(file.path);
  }, 96);
  window.setTimeout(() => {
    clearNativeFileExplorerActiveState();
    applyFileExplorerHighlight(file.path);
  }, 180);
  const newTimer = window.setTimeout(() => {
    document.body.classList.remove("af-suppress-file-explorer-flash");
    setExplorerHighlightSuppressTimer(null);
  }, 180);
  setExplorerHighlightSuppressTimer(newTimer);
}
