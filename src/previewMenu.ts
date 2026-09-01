import { MarkdownView, Menu, MenuItem, Notice, Platform, TFile } from "obsidian";
import LocalImagesPlugin from "./main";
import { getImageMimeTypeFromExtension, loadImageBlob, normalizeImageBlobForClipboard, onElement, isChineseDisplayLanguage, getEditorView } from "./previewHelpers";
import { deleteCurTargetLink, handlerDelFileNew, handlerRenameFile } from "./previewUtil";

export function addMenuExtendedSourceMode(
  plugin: LocalImagesPlugin,
  menu: Menu,
  fileBaseName: string,
  currentMd: TFile,
  targetType: string,
  targetPos: number,
  inTable: boolean,
  inCallout: boolean
): void {
  addMenuExtendedPreviewMode(plugin, menu, fileBaseName, currentMd);
  menu.addItem((item: MenuItem) =>
    item
      .setIcon("pencil")
      .setTitle(isChineseDisplayLanguage() ? "重命名" : "Rename")
      .onClick(() => {
        handlerRenameFile(plugin, fileBaseName, currentMd);
      })
  );

  menu.addItem((item: MenuItem) =>
    item
      .setIcon("trash-2")
      .setTitle(isChineseDisplayLanguage() ? "删除文件及对应链接" : "Delete File and Link")
      .onClick(async () => {
        await handlerDelFileNew(
          plugin,
          fileBaseName,
          currentMd,
          targetType,
          targetPos,
          inTable,
          inCallout
        );
      })
  );
}

export function addMenuExtendedPreviewMode(
  plugin: LocalImagesPlugin,
  menu: Menu,
  fileBaseName: string,
  currentMd: TFile
): void {
  const file = plugin.app.vault.getAbstractFileByPath(
    plugin.app.metadataCache.getFirstLinkpathDest(fileBaseName, currentMd.path)?.path ??
      fileBaseName
  ) as TFile | null;
  if (!(file instanceof TFile)) {
    return;
  }

  menu.addItem((item: MenuItem) =>
    item
      .setIcon("copy")
      .setTitle(isChineseDisplayLanguage() ? "复制图片到剪贴板" : "Copy Image to Clipboard")
      .onClick(async () => {
        try {
          const sourceMimeType = getImageMimeTypeFromExtension(file.extension);
          const sourceBlob = new Blob([await file.vault.readBinary(file)], {
            type: sourceMimeType,
          });
          const { blob, mimeType, convertedToPng } = await normalizeImageBlobForClipboard(
            sourceBlob,
            sourceMimeType
          );
          await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })]);
          new Notice(convertedToPng ? (isChineseDisplayLanguage() ? "已复制到剪贴板（已自动转换为 PNG）" : "Copied to clipboard (automatically converted to PNG)") : (isChineseDisplayLanguage() ? "已复制到剪贴板" : "Copied to clipboard"));
        } catch (error) {
          console.error("Failed to copy image:", error);
          new Notice(isChineseDisplayLanguage() ? "复制文件失败！" : "Failed to copy file!");
        }
      })
  );

  if (Platform.isDesktop) {
    menu.addItem((item: MenuItem) =>
      item
        .setIcon("arrow-up-right")
        .setTitle(isChineseDisplayLanguage() ? "使用默认应用打开" : "Open with Default App")
        .onClick(() => {
          const appWithDesktopApi = plugin.app as unknown as {
            openWithDefaultApp: (path: string) => void;
          };
          appWithDesktopApi.openWithDefaultApp(file.path);
        })
    );
    menu.addItem((item: MenuItem) =>
      item
        .setIcon("arrow-up-right")
        .setTitle(Platform.isMacOS ? (isChineseDisplayLanguage() ? "在 Finder 中显示" : "Show in Finder") : (isChineseDisplayLanguage() ? "在系统资源管理器中显示" : "Show in File Explorer"))
        .onClick(() => {
          const appWithDesktopApi = plugin.app as unknown as {
            showInFolder: (path: string) => void;
          };
          appWithDesktopApi.showInFolder(file.path);
        })
    );
  }

  menu.addItem((item: MenuItem) =>
    item
      .setIcon("folder")
      .setTitle(isChineseDisplayLanguage() ? "在导航中定位文件" : "Locate in Navigation")
      .onClick(() => {
        plugin.previewFeature?.locateFileInExplorer(file);
      })
  );
}

export function addExternalImageMenuPreviewMode(menu: Menu, img: HTMLImageElement): void {
  menu.addItem((item: MenuItem) =>
    item
      .setIcon("copy")
      .setTitle(isChineseDisplayLanguage() ? "复制图片到剪贴板" : "Copy Image to Clipboard")
      .onClick(async () => {
        try {
          const blob = await loadImageBlob(img.src);
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          new Notice(isChineseDisplayLanguage() ? "已复制到剪贴板" : "Copied to clipboard");
        } catch {
          new Notice(isChineseDisplayLanguage() ? "复制图片失败！" : "Failed to copy image!");
        }
      })
  );

  menu.addItem((item: MenuItem) =>
    item
      .setIcon("link")
      .setTitle(isChineseDisplayLanguage() ? "复制图片链接" : "Copy Image Link")
      .onClick(async () => {
        try {
          await navigator.clipboard.writeText(img.src);
          new Notice(isChineseDisplayLanguage() ? "图片链接已复制到剪贴板" : "Image link copied to clipboard");
        } catch (error) {
          console.error("Error copying image link:", error);
          new Notice(isChineseDisplayLanguage() ? "复制图片链接失败" : "Failed to copy image link");
        }
      })
  );
  menu.addItem((item: MenuItem) =>
    item
      .setIcon("link")
      .setTitle(isChineseDisplayLanguage() ? "复制 Markdown 链接" : "Copy Markdown Link")
      .onClick(async () => {
        try {
          await navigator.clipboard.writeText(`![](${img.src})`);
          new Notice(isChineseDisplayLanguage() ? "Markdown链接已复制到剪贴板" : "Markdown link copied to clipboard");
        } catch (error) {
          console.error("Error copying Markdown link:", error);
          new Notice(isChineseDisplayLanguage() ? "复制Markdown链接失败" : "Failed to copy Markdown link");
        }
      })
  );
  menu.addItem((item: MenuItem) =>
    item
      .setIcon("external-link")
      .setTitle(isChineseDisplayLanguage() ? "在外部浏览器中打开" : "Open in External Browser")
      .onClick(async () => {
        window.open(img.src, "_blank");
      })
  );
}

export function addExternalImageMenuSourceMode(
  plugin: LocalImagesPlugin,
  menu: Menu,
  img: HTMLImageElement,
  inTable: boolean,
  inCallout: boolean
): void {
  addExternalImageMenuPreviewMode(menu, img);
  menu.addItem((item: MenuItem) =>
    item
      .setIcon("trash-2")
      .setTitle(isChineseDisplayLanguage() ? "删除图片链接" : "Delete Image Link")
      .onClick(() => {
        const markdownView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
        const editor = markdownView?.editor;
        const editorView = editor ? getEditorView(editor) : undefined;
        if (!editorView) {
          return;
        }
        const targetPos = editorView.posAtDOM(img);
        deleteCurTargetLink(plugin, img.src, targetPos, inTable, inCallout);
      })
  );
}

export function registerEscapeButton(menu: Menu, doc: Document = document): void {
  menu.register(
    onElement(doc, "keydown", "*", (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        menu.hide();
      }
    })
  );
}
