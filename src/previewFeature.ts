import { MarkdownView, Menu, MenuItem, Notice, Platform, TFile } from "obsidian";
import LocalImagesPlugin from "./main";
import {
  onElement,
  isChineseDisplayLanguage,
  getEditorView,
} from "./previewHelpers";
import { getMouseEventTarget } from "./previewEvent";

import {
  addMenuExtendedSourceMode,
  addMenuExtendedPreviewMode,
  addExternalImageMenuPreviewMode,
  addExternalImageMenuSourceMode,
  registerEscapeButton,
} from "./previewMenu";

import {
  applyFileExplorerHighlight,
  clearFileExplorerHighlight,
  locateFileInExplorer,
} from "./previewExplorer";
import { VideoDivWidthChangeWatcher } from "./previewVideoWatcher";



/**
 * 附件流功能类，处理图片预览、右键菜单等功能
 */
export class PreviewFeature {
  plugin: LocalImagesPlugin;
  observer?: MutationObserver;
  videoWidthWatcher?: VideoDivWidthChangeWatcher;
  highlightedExplorerPath: string | null = null;
  explorerHighlightSuppressTimer: number | null = null;
  imageExtensions = new Set(["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp", "avif", "heic"]);
  private referencedNotesCache = new Map<string, TFile[]>();

  constructor(plugin: LocalImagesPlugin) {
    this.plugin = plugin;
  }



  /**
   * 检查文件是否为图片文件
   * @param file 要检查的文件
   * @returns 是否为图片文件
   */
  private isImageFile(file: TFile): boolean {
    return this.imageExtensions.has(file.extension.toLowerCase());
  }

  /**
   * 获取引用指定图片的 Markdown 笔记
   * @param file 图片文件
   * @returns 引用该图片的 Markdown 笔记数组
   */
  private getReferencingMarkdownNotes(file: TFile): TFile[] {
    const cacheKey = file.path;
    if (this.referencedNotesCache.has(cacheKey)) {
      return this.referencedNotesCache.get(cacheKey);
    }

    const refs: TFile[] = [];
    const resolvedLinks = this.plugin.app.metadataCache.resolvedLinks;

    for (const [sourcePath, linkedPaths] of Object.entries(resolvedLinks)) {
      if (!linkedPaths[file.path]) {
        continue;
      }
      const sourceFile = this.plugin.app.vault.getAbstractFileByPath(sourcePath);
      if (!(sourceFile instanceof TFile) || !sourceFile.path.endsWith(".md")) {
        continue;
      }
      refs.push(sourceFile);
    }

    refs.sort((a, b) => a.path.localeCompare(b.path));
    this.referencedNotesCache.set(cacheKey, refs);
    return refs;
  }

  /**
   * 提取 Excalidraw 基础名称
   * @param filesource Excalidraw 文件源路径
   * @returns 提取后的基础名称
   */
  private extractExcalidrawBaseName(filesource: string): string {
    let fileBaseName = filesource;
    if (fileBaseName.includes("/")) {
      const tempArr = fileBaseName.split("/");
      fileBaseName = tempArr[tempArr.length - 1];
    } else if (fileBaseName.includes("\\")) {
      const tempArr = fileBaseName.split("\\");
      fileBaseName = tempArr[tempArr.length - 1];
    }
    fileBaseName = fileBaseName.endsWith(".md")
      ? fileBaseName.substring(0, fileBaseName.length - 3)
      : fileBaseName;
    return fileBaseName.replace(/^(\.\.\/)+/g, "");
  }

  /**
   * 打开引用指定图片的原笔记
   * @param file 图片文件
   */
  private async openSourceNoteForImage(file: TFile): Promise<void> {
    try {
      const notes = this.getReferencingMarkdownNotes(file);
      if (notes.length === 0) {
        new Notice(
          isChineseDisplayLanguage()
            ? "没有找到引用这张图片的笔记。"
            : "No note references this image."
        );
        return;
      }

      await this.plugin.app.workspace.getLeaf(true).openFile(notes[0]);

      if (notes.length > 1) {
        new Notice(
          isChineseDisplayLanguage()
            ? `找到了多个引用笔记，已打开第一个：${notes[0].basename}`
            : `Multiple notes reference this image. Opened the first one: ${notes[0].basename}`
        );
      }
    } catch (error) {
      console.error("Error opening source note for image:", error);
      new Notice(
        isChineseDisplayLanguage()
          ? "打开引用笔记时出错。"
          : "Error opening source note."
      );
    }
  }

/**
   * 加载插件功能
   */
  async onload(): Promise<void> {
    this.registerDocument(document);

    this.plugin.registerEvent(
      this.plugin.app.workspace.on("window-open", (workspaceWindow, window) => {
        this.registerDocument(window.document);
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile)) {
          return;
        }

        if (!this.isImageFile(file) || this.getReferencingMarkdownNotes(file).length === 0) {
          return;
        }

        menu.addItem((item: MenuItem) => {
          item
            .setTitle(isChineseDisplayLanguage() ? "跳转到原笔记" : "Go to Source Note")
            .setIcon("file-input")
            .onClick(async () => {
              await this.openSourceNoteForImage(file);
            });
        });
      })
    );

    this.initMutationObserver();
    window.setTimeout(() => {
      this.videoWidthWatcher = new VideoDivWidthChangeWatcher();
    }, 1000);

    this.plugin.registerEvent(
      this.plugin.app.workspace.on("file-open", () => {
        this.videoWidthWatcher?.disconnect();
        this.videoWidthWatcher = new VideoDivWidthChangeWatcher();
      })
    );

    // 监听文件变化，清除缓存
    this.plugin.registerEvent(
      this.plugin.app.vault.on("modify", () => {
        this.referencedNotesCache.clear();
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.vault.on("delete", () => {
        this.referencedNotesCache.clear();
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.vault.on("rename", () => {
        this.referencedNotesCache.clear();
      })
    );
  }

onunload(): void {
    this.observer?.disconnect();
    this.videoWidthWatcher?.disconnect();
    if (this.explorerHighlightSuppressTimer !== null) {
      window.clearTimeout(this.explorerHighlightSuppressTimer);
      this.explorerHighlightSuppressTimer = null;
    }
    document.body.classList.remove("af-suppress-file-explorer-flash");
    clearFileExplorerHighlight();
  }

/**
 * 初始化突变观察器，用于监听 DOM 变化
 */
  initMutationObserver(): void {
    const targetNode = document.querySelector(".workspace");
    if (!targetNode) {
      return;
    }

    const config = { childList: true, subtree: true };
    const callback = (mutationsList: MutationRecord[]) => {
      for (const mutation of mutationsList) {
        if (!mutation.addedNodes.length) {
          continue;
        }
        mutation.addedNodes.forEach((node) => {
          if (!(node.instanceOf(Element))) {
            return;
          }

          // 只处理包含视频或导航文件夹的节点，提高性能
          if (node.querySelector("video") || node.classList.contains("nav-folder")) {
            // 处理视频宽度同步
            const videos = node.querySelectorAll("video");
            videos.forEach((video) => {
              const parentDiv = video.closest(".internal-embed.media-embed.video-embed.is-loaded");
              if (parentDiv && parentDiv.getAttribute("width")) {
                video.style.width = `${parentDiv.getAttribute("width")}px`;
              }
            });

            // 处理文件浏览器高亮
            applyFileExplorerHighlight(this.highlightedExplorerPath);
          }
        });
      }
    };

    this.observer = new MutationObserver(callback);
    this.observer.observe(targetNode, config);
  }

/**
   * 在文件浏览器中定位文件
   * @param file 要定位的文件
   */
  public locateFileInExplorer(file: TFile): void {
    locateFileInExplorer(
      this.plugin,
      file,
      this.explorerHighlightSuppressTimer,
      (timer) => (this.explorerHighlightSuppressTimer = timer),
      (path) => (this.highlightedExplorerPath = path)
    );
  }

/**
   * 注册文档事件监听器
   * @param doc 文档对象
   */
  registerDocument(doc: Document): void {
    this.plugin.register(
      onElement(doc, "contextmenu", "img, iframe, video, div.file-embed-title, audio",
        (event) => this.onRightClickMenu(event as MouseEvent),
        { capture: true }
      )
    );

    if (Platform.isDesktop) {
      this.plugin.register(
        onElement(doc, "mousedown", "img", (event) => this.externalImageContextMenuCall(event as MouseEvent))
      );
    }
  }





/**
   * 处理外部图片的右键菜单
   * @param event 鼠标事件
   */
  externalImageContextMenuCall(event: MouseEvent): void {
    const img = event.target as HTMLImageElement;
    const inTable = img.closest("table") != null;
    const inCallout = img.closest(".callout") != null;
    if (!img.src.startsWith("http") || event.button !== 2) {
      return;
    }

    event.preventDefault();
    this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor?.blur();
    const menu = new Menu();
    const inPreview =
      this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.getMode() === "preview";
    if (inPreview) {
      addExternalImageMenuPreviewMode(menu, img);
    } else {
      addExternalImageMenuSourceMode(this.plugin, menu, img, inTable, inCallout);
    }

    registerEscapeButton(menu);

    let offset = 0;
    if (!inPreview && (inTable || inCallout)) {
      offset = -138;
    }
    menu.showAtPosition({ x: event.pageX, y: event.pageY + offset });
    this.plugin.app.workspace.trigger("Preview:contextmenu", menu);
  }











/**
   * 处理右键菜单事件
   * @param event 鼠标事件
   */
  onRightClickMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const target = getMouseEventTarget(event);
    const targetType = target.localName;

    const currentMd = this.plugin.app.workspace.getActiveFile();
    if (!currentMd) {
      return;
    }
    const inCanvas = currentMd.name.endsWith(".canvas");
    const supportedTargetType = ["img", "iframe", "video", "div", "audio"];
    if (!supportedTargetType.includes(targetType)) {
      return;
    }

    const menu = new Menu();
    const inTable = target.closest("table") != null;
    const inCallout = target.closest(".callout") != null;
    const inPreview =
      this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.getMode() === "preview";
    const isExcalidraw = target.classList.contains("excalidraw-embedded-img");

    let targetName = target.getAttribute("src");
    
    if (targetName && targetName.startsWith("http")) {
      return;
    }

    if (inCanvas) {
      if (target.parentElement?.classList.contains("canvas-node-content")) {
        return;
      }
      return;
    }

    if (isExcalidraw) {
      // 从目标元素获取 Excalidraw 基础名称
      let excalidrawTargetName = target.getAttribute("filesource");
      targetName = this.extractExcalidrawBaseName(excalidrawTargetName);
    } else {
      targetName = (target.closest(".internal-embed")?.getAttribute("src"))?.replace(
        /^(\.\.\/)+/g,
        ""
      );
      
      const pdfMatch = targetName?.match(/.*\.pdf/);
      targetName = pdfMatch ? pdfMatch[0] : targetName;
      
      if (targetType === "img" && pdfMatch) {
        return;
      }
    }

    if (!targetName) {
      return;
    }

    if (inPreview) {
      addMenuExtendedPreviewMode(this.plugin, menu, targetName, currentMd);
    } else {
      const editor = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
      // 使用更安全的类型检查
      const editorView = editor ? getEditorView(editor) : undefined;
      if (!editorView) {
        return;
      }
      const targetPos = editorView.posAtDOM(target);
      addMenuExtendedSourceMode(
        this.plugin,
        menu,
        targetName,
        currentMd,
        targetType,
        targetPos,
        inTable,
        inCallout
      );
    }

    registerEscapeButton(menu);

    const isLinux = Platform.isLinux;
    let offset = isLinux ? -138 : -163;
    if (inTable && !inPreview) {
      menu.showAtPosition({ x: event.pageX, y: event.pageY + offset });
    } else {
      menu.showAtPosition({ x: event.pageX, y: event.pageY });
    }
    this.plugin.app.workspace.trigger("Preview:contextmenu", menu);
  }
}
