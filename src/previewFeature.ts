import { Editor, MarkdownView, Menu, MenuItem, Notice, Platform, TFile } from "obsidian";
import { EditorView } from "@codemirror/view";
import LocalImagesPlugin from "./main";
import {
  getImageMimeTypeFromExtension,
  loadImageBlob,
  normalizeImageBlobForClipboard,
  onElement,
  isChineseDisplayLanguage,
} from "./previewHelpers";
import { getMouseEventTarget } from "./previewEvent";

import {
  deleteCurTargetLink,
  handlerDelFileNew,
  handlerRenameFile,
  print,
  setDebug,
} from "./previewUtil";

import {
  createZoomMask,
  createZoomedImage,
  createZoomScaleDiv,
  handleZoomMouseWheel,
  handleZoomContextMenu,
  adaptivelyDisplayImage,
  handleZoomDragStart,
  updateZoomScaleDiv,
} from "./previewZoom";

import {
  addMenuExtendedSourceMode,
  addMenuExtendedPreviewMode,
  addExternalImageMenuPreviewMode,
  addExternalImageMenuSourceMode,
  registerEscapeButton,
} from "./previewMenu";

import {
  clearFileExplorerHighlight,
  clearNativeFileExplorerActiveState,
  applyFileExplorerHighlight,
  locateFileInExplorer,
} from "./previewExplorer";

import {
  updateInternalLink,
  updateExternalLink,
} from "./previewLink";
import { VideoDivWidthChangeWatcher } from "./previewVideoWatcher";



/**
 * 节流函数，限制函数的执行频率
 * @param func 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数
 */
function throttle<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return function(...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall < delay) return;
    lastCall = now;
    func.apply(this, args);
  };
}

/**
 * 附件流功能类，处理图片预览、右键菜单、拖拽调整大小等功能
 */
export class PreviewFeature {
  plugin: LocalImagesPlugin;
  resizeEdgeSize = 20;
  observer?: MutationObserver;
  videoWidthWatcher?: VideoDivWidthChangeWatcher;
  highlightedExplorerPath: string | null = null;
  explorerHighlightSuppressTimer: number | null = null;
  imageExtensions = new Set(["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp", "avif"]);
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
      return this.referencedNotesCache.get(cacheKey)!;
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
   * 检查鼠标点击是否在图片预览区域内
   * @param target 图片元素
   * @param evt 鼠标事件
   * @returns 是否在预览区域内
   */
  private isInsidePreviewClickZone(target: HTMLImageElement, evt: MouseEvent): boolean {
    const rect = target.getBoundingClientRect();
    const edgeSize = Math.min(this.resizeEdgeSize, rect.width / 4, rect.height / 4);
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    return x > edgeSize && y > edgeSize && x < rect.width - edgeSize && y < rect.height - edgeSize;
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

    this.plugin.registerDomEvent(document, "click", async (evt: MouseEvent) => {
      if (!this.plugin.settings.clickPreviewEnabled) {
        return;
      }
      const target = evt.target as HTMLElement;
      if (target.tagName !== "IMG") {
        this.removeZoomedImage();
        return;
      }
      if (!this.isInsidePreviewClickZone(target as HTMLImageElement, evt)) {
        return;
      }
      if (document.getElementById("preview-zoomed-image")) {
        evt.preventDefault();
        this.removeZoomedImage();
        return;
      }
      evt.preventDefault();
      createZoomMask();
      const { zoomedImage, originalWidth, originalHeight } = await createZoomedImage(
        (target as HTMLImageElement).src,
        this.plugin.settings.previewAdaptiveRatio
      );
      const scaleDiv = createZoomScaleDiv(zoomedImage, originalWidth, originalHeight);
      zoomedImage.addEventListener("wheel", (e) =>
        handleZoomMouseWheel(e, zoomedImage, originalWidth, originalHeight, scaleDiv)
      );
      zoomedImage.addEventListener("contextmenu", (e) =>
        handleZoomContextMenu(e, zoomedImage, originalWidth, originalHeight, scaleDiv)
      );
      zoomedImage.addEventListener("mousedown", (e) => handleZoomDragStart(e, zoomedImage));
      zoomedImage.addEventListener("dblclick", () => {
        adaptivelyDisplayImage(
          zoomedImage,
          originalWidth,
          originalHeight,
          this.plugin.settings.previewAdaptiveRatio
        );
        updateZoomScaleDiv(scaleDiv, zoomedImage, originalWidth, originalHeight);
      });
    });

    this.plugin.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
      if (evt.key === "Escape") {
        this.removeZoomedImage();
      }
    });

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

    setDebug(this.plugin.settings.debugMode);
  }

/**
   * 卸载插件功能
   */
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
   * 刷新调试模式设置
   */
  refreshDebug(): void {
    setDebug(this.plugin.settings.debugMode);
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
          if (!(node instanceof Element)) {
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
   * 移除缩放的图片
   */
  removeZoomedImage(): void {
    const zoomedImage = document.getElementById("preview-zoomed-image");
    if (zoomedImage) {
      document.body.removeChild(zoomedImage);
    }
    const scaleDiv = document.getElementById("preview-scale-div");
    if (scaleDiv) {
      document.body.removeChild(scaleDiv);
    }
    const mask = document.getElementById("preview-mask");
    if (mask) {
      document.body.removeChild(mask);
    }
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
      onElement(
        doc,
        "contextmenu" as keyof HTMLElementEventMap,
        "img, iframe, video, div.file-embed-title, audio",
        this.onRightClickMenu.bind(this),
        { capture: true }
      )
    );

    this.plugin.register(
      onElement(doc, "mousedown", "img, video", (event: MouseEvent) => {
        if (!this.plugin.settings.dragResizeEnabled) {
          return;
        }
        const currentMd = this.plugin.app.workspace.getActiveFile();
        if (!currentMd || currentMd.name.endsWith(".canvas")) {
          return;
        }
        const inPreview =
          this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.getMode() === "preview";
        if (inPreview) {
          return;
        }

        if (event.button === 0) {
          event.preventDefault();
        }
        const img = event.target as HTMLImageElement | HTMLVideoElement;
        if (img.id === "preview-zoomed-image") {
          return;
        }

        const editor = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        // 使用更安全的类型检查
        const editorView = (editor as { cm?: EditorView })?.cm;
        if (!editorView) {
          return;
        }
        const targetPos = editorView.posAtDOM(img);
        const inTable = img.closest("table") != null;
        const inCallout = img.closest(".callout") != null;

        const preventEvent = (evt: MouseEvent) => {
          evt.preventDefault();
          evt.stopPropagation();
        };

        const rect = img.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const edgeSize = this.resizeEdgeSize;

        if (
          x < edgeSize ||
          y < edgeSize ||
          x > rect.width - edgeSize ||
          y > rect.height - edgeSize
        ) {
          const startX = event.clientX;
          const startWidth = img.clientWidth;
          const startHeight = img.clientHeight;
          let lastUpdateX = startX;
          let lastUpdate = 1;
          let updatedWidth = startWidth;

          const onMouseMove = throttle((moveEvent: MouseEvent) => {
            img.addEventListener("click", preventEvent);
            const currentX = moveEvent.clientX;
            lastUpdate = currentX - lastUpdateX === 0 ? lastUpdate : currentX - lastUpdateX;
            let newWidth = startWidth + (currentX - startX);
            const aspectRatio = startWidth / startHeight;
            newWidth = Math.max(Math.round(newWidth), 100);
            const newHeight = Math.round(newWidth / aspectRatio);
            updatedWidth = newWidth;

            img.classList.add("image-in-drag-resize");
            img.style.width = `${newWidth}px`;

            this.updateImageLinkWithNewSize(img, targetPos, newWidth, newHeight);
            lastUpdateX = moveEvent.clientX;
          }, 50);

          const allowOtherEvent = () => {
            img.removeEventListener("click", preventEvent);
          };

          const onMouseUp = (upEvent: MouseEvent) => {
            window.setTimeout(allowOtherEvent, 100);
            upEvent.preventDefault();
            img.classList.remove("image-in-drag-resize", "image-ready-click-view");
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);

            if (this.plugin.settings.dragResizeStep > 1) {
              const resizeInterval = this.plugin.settings.dragResizeStep;
              const widthOffset = lastUpdate > 0 ? resizeInterval : 0;
              if (updatedWidth % resizeInterval !== 0) {
                updatedWidth =
                  Math.floor(updatedWidth / resizeInterval) * resizeInterval + widthOffset;
              }
              img.style.width = `${updatedWidth}px`;
              this.updateImageLinkWithNewSize(img, targetPos, updatedWidth, 0);
            }
          };

          // 使用plugin.registerDomEvent注册事件监听器，确保在插件卸载时被正确移除
          this.plugin.registerDomEvent(document, "mousemove", onMouseMove);
          this.plugin.registerDomEvent(document, "mouseup", onMouseUp);
        }
      })
    );

    this.plugin.register(
      onElement(doc, "mouseover", "img, video", (event: MouseEvent) => {
        const currentMd = this.plugin.app.workspace.getActiveFile();
        if (!currentMd || currentMd.name.endsWith(".canvas")) {
          return;
        }
        const inPreview =
          this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.getMode() === "preview";
        const img = event.target as HTMLImageElement | HTMLVideoElement;
        const edgeSize = this.resizeEdgeSize;
        if (img.id === "preview-zoomed-image") {
          return;
        }

        let lastMove = 0;
        const mouseOverHandler = (moveEvent: MouseEvent) => {
          if (moveEvent.buttons !== 0) {
            return;
          }
          const now = Date.now();
          if (now - lastMove < 100) {
            return;
          }
          lastMove = now;

          const rect = img.getBoundingClientRect();
          const x = moveEvent.clientX - rect.left;
          const y = moveEvent.clientY - rect.top;

          if (
            x >= rect.width - edgeSize ||
            x <= edgeSize ||
            y >= rect.height - edgeSize ||
            y <= edgeSize
          ) {
            if (this.plugin.settings.dragResizeEnabled && !inPreview) {
              img.classList.remove("image-ready-click-view");
              img.classList.add("image-ready-resize");
            } else if (inPreview && this.plugin.settings.clickPreviewEnabled) {
              img.classList.add("image-ready-click-view");
              img.classList.remove("image-ready-resize");
            }
          } else if (this.plugin.settings.clickPreviewEnabled) {
            img.classList.add("image-ready-click-view");
            img.classList.remove("image-ready-resize");
          } else {
            img.classList.remove("image-ready-click-view", "image-ready-resize");
          }
        };
        this.plugin.registerDomEvent(img, "mousemove", mouseOverHandler);
      })
    );

    this.plugin.register(
      onElement(doc, "mouseout", "img, video", (event: MouseEvent) => {
        const currentMd = this.plugin.app.workspace.getActiveFile();
        if (!currentMd || currentMd.name.endsWith(".canvas")) {
          return;
        }
        if (event.buttons !== 0) {
          return;
        }
        const img = event.target as HTMLImageElement | HTMLVideoElement;
        if (this.plugin.settings.clickPreviewEnabled || this.plugin.settings.dragResizeEnabled) {
          img.classList.remove("image-ready-click-view", "image-ready-resize");
        }
      })
    );

    this.plugin.register(
      onElement(doc, "mousedown", "img", this.externalImageContextMenuCall.bind(this))
    );
  }





/**
   * 更新图片链接的大小
   * @param img 图片或视频元素
   * @param targetPos 目标位置
   * @param newWidth 新宽度
   * @param newHeight 新高度
   */
  updateImageLinkWithNewSize = (
    img: HTMLImageElement | HTMLVideoElement,
    targetPos: number,
    newWidth: number,
    newHeight: number
  ): void => {
    const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    const inTable = img.closest("table") != null;
    const inCallout = img.closest(".callout") != null;
    const isExcalidraw = img.classList.contains("excalidraw-embedded-img");
    if (!activeView) {
      return;
    }

    let imageName = img.getAttribute("src");
    if (imageName?.startsWith("http")) {
      updateExternalLink(activeView, img, targetPos, newWidth, newHeight, inTable, inCallout);
    } else if (isExcalidraw) {
      // 从目标元素获取 Excalidraw 基础名称
      let excalidrawTargetName = img.getAttribute("filesource") as string;
      let fileBaseName = this.extractExcalidrawBaseName(excalidrawTargetName);
      img.style.maxWidth = "none";
      updateInternalLink(activeView, targetPos, fileBaseName, newWidth, inTable, inCallout);
    } else {
      imageName = img.closest(".internal-embed")?.getAttribute("src") as string;
      updateInternalLink(activeView, targetPos, imageName, newWidth, inTable, inCallout);
    }
  };

/**
   * 处理外部图片的右键菜单
   * @param event 鼠标事件
   */
  externalImageContextMenuCall(event: MouseEvent): void {
    const img = event.target as HTMLImageElement;
    const inTable = img.closest("table") != null;
    const inCallout = img.closest(".callout") != null;
    if (img.id === "preview-zoomed-image" || !img.src.startsWith("http") || event.button !== 2) {
      return;
    }

    event.preventDefault();
    this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor?.blur();
    img.classList.remove("image-ready-click-view", "image-ready-resize");
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
    if (target.id === "preview-zoomed-image") {
      return;
    }

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

    let targetName = target.getAttribute("src") as string;
    
    if (targetName && targetName.startsWith("http")) {
      return;
    }

    if (inCanvas) {
      if (target.parentElement?.classList.contains("canvas-node-content")) {
        return;
      }
      return;
    }

    target.classList.remove("image-ready-click-view", "image-ready-resize");

    if (isExcalidraw) {
      // 从目标元素获取 Excalidraw 基础名称
      let excalidrawTargetName = target.getAttribute("filesource") as string;
      targetName = this.extractExcalidrawBaseName(excalidrawTargetName);
    } else {
      targetName = (target.closest(".internal-embed")?.getAttribute("src") as string)?.replace(
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
      const editorView = (editor as { cm?: EditorView })?.cm;
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

    const isLinux = navigator.userAgent.toLowerCase().includes("linux");
    let offset = isLinux ? -138 : -163;
    if (inTable && !inPreview) {
      menu.showAtPosition({ x: event.pageX, y: event.pageY + offset });
    } else {
      menu.showAtPosition({ x: event.pageX, y: event.pageY });
    }
    this.plugin.app.workspace.trigger("Preview:contextmenu", menu);
  }
}


