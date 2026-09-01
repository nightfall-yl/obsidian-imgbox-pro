import {
  Notice,
  Plugin,
  TFile,
  Editor,
  htmlToMarkdown,
  MarkdownView,
  MarkdownFileInfo,
  TFolder,
  EmbedCache,
} from "obsidian";

import SettingTab from "./settingstab";

import { imageTagProcessor, getMDir, getRDir } from "./contentProcessor";

import {
  replaceAsync,
  cFileName,
  md5Sig,
  generateTimestampRandomName,
  trimAny,
  logError,
  showBalloon,
  showStatusBalloon,
  displayError,
  encObsURI,
  pathJoin,
  blobToJpegArrayBuffer,
  getFileExt,
  pathBasename,
  pathDirname,
  pathParse,
  pathExtname,
} from "./utils";

import {
  APP_NAME,
  ISettings,
  DEFAULT_SETTINGS,
  MD_SEARCH_PATTERN,
  NOTICE_TIMEOUT,
  TIMEOUT_LIKE_INFINITY,
} from "./config";

import { UniqueQueue } from "./uniqueQueue";
import { ModalW1 } from "./modal";
import { ClearUnusedLogsModal, ClearUnusedPreviewModal } from "./clearUnusedModal";
import { deleteFilesInTheList, getFormattedDate, getUnusedAttachments } from "./clearUnusedUtils";
import { getAllLinkMatchesInFile } from "./clearUnusedLinkDetector";
import { PreviewFeature } from "./previewFeature";
import { isChineseDisplayLanguage } from "./previewHelpers";

const RECENT_CREATED_FILE_MAX_AGE_MS = 10000;

const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "bmp", "webp", "avif", "heic",
]);

export default class LocalImagesPlugin extends Plugin {
  settings: ISettings;
  modifiedQueue = new UniqueQueue<TFile>();
  intervalId = 0;
  newfProcInt: number;
  newfCreated: Array<string> = [];
  noteModified: Array<TFile> = [];
  newfMoveReq: boolean = true;
  newfCreatedByDownloader: Array<string> = [];
  clearUnusedRibbonIconEl: HTMLElement | undefined = undefined;
  previewFeature: PreviewFeature | undefined = undefined;
  latestCreatedMarkdownFile: TFile | null = null;
  pendingPastedMarkdownFile: TFile | null = null;
  pendingPastedMarkdownTime = 0;

  private queueAttachmentTargetNote(noteFile: TFile | null) {
    if (!noteFile || !this.ExemplaryOfMD(noteFile.path) || this.noteModified.includes(noteFile)) {
      return;
    }

    this.noteModified.push(noteFile);
  }

  private getEmbeddedAttachmentsFromContent(filedata: string): Array<Pick<EmbedCache, "link" | "original">> {
    const embeds: Array<Pick<EmbedCache, "link" | "original">> = [];
    const seen = new Set<string>();
    const addEmbed = (link: string, original: string) => {
      if (!link || seen.has(original)) {
        return;
      }

      embeds.push({ link, original });
      seen.add(original);
    };

    const wikiEmbedRegex = /!\[\[([^\]\n]+)\]\]/g;
    for (const match of filedata.matchAll(wikiEmbedRegex)) {
      const original = match[0];
      const link = match[1].split("|")[0].trim();
      addEmbed(link, original);
    }

    const markdownEmbedRegex = /!\[[^\]\n]*\]\(([^)\n]+)\)/g;
    for (const match of filedata.matchAll(markdownEmbedRegex)) {
      const original = match[0];
      let link = match[1].trim();
      try {
        link = decodeURIComponent(link);
      } catch (e) {
        logError(e);
      }
      if (/^(https?:|data:)/i.test(link)) {
        continue;
      }

      addEmbed(link, original);
    }

    return embeds;
  }

  private getEmbeddedAttachments(
    metaEmbeds: EmbedCache[] | undefined,
    filedata: string
  ): Array<Pick<EmbedCache, "link" | "original">> {
    const embeds: Array<Pick<EmbedCache, "link" | "original">> = [];
    const seen = new Set<string>();

    for (const embed of metaEmbeds ?? []) {
      embeds.push(embed);
      seen.add(embed.original);
    }

    for (const embed of this.getEmbeddedAttachmentsFromContent(filedata)) {
      if (!seen.has(embed.original)) {
        embeds.push(embed);
      }
    }

    return embeds;
  }

  private async getCurrentNoteAttachmentBaseNames(noteFile: TFile): Promise<Set<string>> {
    const attachmentNames = new Set<string>();
    const fileCache = this.app.metadataCache.getFileCache(noteFile);
    const embeds = fileCache?.embeds ?? [];
    const links = fileCache?.links ?? [];

    for (const embed of embeds) {
      attachmentNames.add(pathBasename(embed.link));
    }

    for (const link of links) {
      attachmentNames.add(pathBasename(link.link));
    }

    if (fileCache?.frontmatter) {
      for (const value of Object.values(fileCache.frontmatter)) {
        if (typeof value !== "string") {
          continue;
        }

        const bannerMatch = value.match(/!\[\[(.*?)\]\]/);
        if (bannerMatch?.[1]) {
          attachmentNames.add(pathBasename(bannerMatch[1]));
          continue;
        }

        if (/\.(jpe?g|png|gif|svg|bmp|webp|avif|heic)(\?.*)?$/i.test(value)) {
          attachmentNames.add(pathBasename(value));
        }
      }
    }

    const linkMatches = await getAllLinkMatchesInFile(noteFile, this.app);
    for (const linkMatch of linkMatches) {
      attachmentNames.add(pathBasename(linkMatch.linkText));
    }

    return attachmentNames;
  }

  private async findDuplicateAttachmentByHash(
    folderPath: string,
    hash: string,
    excludePath?: string
  ): Promise<TFile | null> {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) {
      return null;
    }

    for (const child of folder.children) {
      if (!(child instanceof TFile) || child.path === excludePath) {
        continue;
      }

      const fileHash = md5Sig(await this.app.vault.adapter.readBinary(child.path));
      if (fileHash === hash) {
        return child;
      }
    }

    return null;
  }

  private async buildTimestampedAttachmentPath(
    folderPath: string,
    extension: string,
    hash?: string | null
  ): Promise<string> {
    let candidatePath = "";
    do {
      candidatePath = pathJoin([folderPath, generateTimestampRandomName(extension, hash)]);
    } while (await this.app.vault.adapter.exists(candidatePath));

    return candidatePath;
  }

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "download-images",
      name: isChineseDisplayLanguage()
        ? "本地化当前笔记附件（自定义位置）"
        : "Localize attachments for the current note (custom location)",
      callback: this.processActivePage(false),
    });

    this.addCommand({
      id: "download-images-def",
      name: isChineseDisplayLanguage()
        ? "本地化当前笔记附件（Obsidian 位置）"
        : "Localize attachments for the current note (Obsidian location)",
      callback: this.processActivePage(true),
    });

    this.addCommand({
      id: "clear-unused-images",
      name: isChineseDisplayLanguage()
        ? "清理库中未引用的图片"
        : "Clear Unused Images in Vault",
      callback: () => this.clearUnusedAttachments("image"),
    });

    this.addCommand({
      id: "clear-unused-attachments",
      name: isChineseDisplayLanguage()
        ? "清理库中未引用的附件"
        : "Clear Unused Attachments in Vault",
      callback: () => this.clearUnusedAttachments("all"),
    });

    this.refreshRibbonIcons();

    this.addCommand({
      id: "download-images-all",
      name: isChineseDisplayLanguage()
        ? "批量本地化所有笔记的附件（自定义位置）"
        : "Localize attachments for all your notes (custom location)",
      callback: this.openProcessAllModal,
    });

    this.addCommand({
      id: "clear-unlinked-attachments-current-note-folder",
      name: isChineseDisplayLanguage()
        ? "清理当前笔记文件夹中的孤立附件（笔记旁模式）"
        : "Clear Unlinked Attachments in Current Note Folder (Next to Note mode)",
      callback: () => {
        void this.removeOrphans("plugin")();
      },
    });

    this.registerEvent(
      this.app.vault.on("create", async (file: TFile) => {
        logError("New file created: " + file.path);

        if (this.ExemplaryOfMD(file.path) && !this.ThePathExcluded(String(file.parent?.path))) {
          void this.onMdCreateFunc(file);
        } else {
          void this.onFCreateFunc(file);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", async (file: TFile) => {
        if (
          !file ||
          !(file instanceof TFile) ||
          !this.ExemplaryOfMD(file.path) ||
          !this.settings.syncMediaFolder ||
          this.settings.attachmentSaveLocation != "nextToNoteS"
        ) {
          return;
        }

        let rootdir = this.settings.mediaFolderPath;

        if (pathBasename(rootdir).includes("${notename}")) {
          rootdir = rootdir.replace("${notename}", file.basename);

          if (this.settings.attachmentSaveLocation == "nextToNoteS") {
            rootdir = pathJoin([pathDirname(file?.path || ""), rootdir]);
          }

          try {
            if (this.app.vault.getAbstractFileByPath(rootdir) instanceof TFolder) {
              void this.app.fileManager.trashFile(this.app.vault.getAbstractFileByPath(rootdir));
              showStatusBalloon(
                isChineseDisplayLanguage()
                  ? `附件文件夹 ${rootdir} 已移入回收站。`
                  : "Attachment folder " + rootdir + " was moved to trash can.",
                this.settings.showNotifications
              );
            }
          } catch (e) {
            logError(e);
            return;
          }
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", async (file: TFile, oldPath: string) => {
        if (
          !file ||
          !(file instanceof TFile) ||
          !this.ExemplaryOfMD(file.path) ||
          this.ThePathExcluded(String(file.parent?.path)) ||
          !this.settings.syncMediaFolder ||
          this.settings.attachmentSaveLocation != "nextToNoteS" ||
          this.settings.linkPathFormat != "onlyRelative"
        ) {
          return;
        }

        let oldRootdir = this.settings.mediaFolderPath;

        if (pathBasename(oldRootdir).includes("${notename}")) {
          oldRootdir = oldRootdir.replace("${notename}", pathParse(oldPath)?.name);
          let newRootDir = oldRootdir.replace(pathParse(oldPath)?.name, pathParse(file.path)?.name);
          let newRootDir_ = newRootDir;
          let oldRootdir_ = oldRootdir;

          oldRootdir_ = pathJoin([pathDirname(oldPath) || "", oldRootdir]);
          newRootDir_ = pathJoin([pathDirname(file.path) || "", newRootDir]);

          try {
            if (this.app.vault.getAbstractFileByPath(oldRootdir_) instanceof TFolder) {
              await this.ensureFolderExists(pathDirname(newRootDir_));
              await this.app.vault.adapter.rename(oldRootdir_, newRootDir_);
              showStatusBalloon(
                isChineseDisplayLanguage()
                  ? `附件文件夹已重命名为 ${newRootDir_}`
                  : "Attachment folder was renamed to " + newRootDir_,
                this.settings.showNotifications
              );
            }
          } catch (e) {
            showBalloon(
              isChineseDisplayLanguage()
                ? "无法移动附件文件夹：\r\n" + String(e)
                : "Cannot move attachment folder: \r\n" + String(e),
              true
            );
            logError(e);
            return;
          }
          let content = await this.app.vault.cachedRead(file);
          content = content
            .replaceAll(`](${encodeURI(oldRootdir)}`, `](${encodeURI(newRootDir)})`)
            .replaceAll(`[${oldRootdir}`, `[${newRootDir}]`);
          void this.app.vault.modify(file, content);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("modify", async (file: TFile) => {
        if (!this.settings.processNewAttachments) return;
        logError("File modified: " + file.path, false);

        if (
          !file ||
          !(file instanceof TFile) ||
          this.ThePathExcluded(String(file.parent?.path)) ||
          !this.ExemplaryOfMD(file.path)
        ) {
          return;
        } else {
          if (!this.noteModified.includes(file)) {
            this.noteModified.push(file);
          }
          if (this.newfCreated.length > 0) {
            this.newfMoveReq = true;
            this.setupNewMdFilesProcInterval();
          }
        }
      })
    );

    this.registerEvent(
      this.app.workspace.on("editor-paste", (evt, editor, info) => {
        if (evt.defaultPrevented) {
          return;
        }

        // 过滤器：仅拦截待本地化的图片/文件粘贴。普通文本粘贴必须放行，故
        // 不能无条件 preventDefault()。只有当剪贴板含文件、且目标笔记不在
        // 排除文件夹时，才拦截 Obsidian 默认插入文件路径，改由 onPasteFunc
        // 处理本地化。
        const activeFile = this.getCurrentNote();
        if (
          (evt.clipboardData?.files.length ?? 0) > 0 &&
          activeFile &&
          !this.ThePathExcluded(String(activeFile.parent?.path))
        ) {
          evt.preventDefault();
        }

        void this.onPasteFunc(evt, editor, info);
      })
    );

    this.setupQueueInterval();
    this.previewFeature = new PreviewFeature(this);
    await this.previewFeature.onload();
    this.addSettingTab(new SettingTab(this.app, this));
  }

  refreshRibbonIcons = () => {
    this.clearUnusedRibbonIconEl?.remove();

    if (this.settings.showCleanupRibbon) {
      const displayLang = document.documentElement.lang?.toLowerCase() ?? "";
      const ribbonTitle = displayLang.startsWith("zh") ? "清理未使用图片" : "Clear unused images";

      this.clearUnusedRibbonIconEl = this.addRibbonIcon("image-file", ribbonTitle, () => {
        void this.clearUnusedAttachments("image");
      });
    }
  };

  clearUnusedAttachments = async (type: "all" | "image") => {
    const isChinese = isChineseDisplayLanguage();
    const targetName = isChinese
      ? type === "image"
        ? "图片"
        : "附件"
      : type === "image"
      ? "image(s)"
      : "attachment(s)";
    const unusedAttachments: TFile[] = await getUnusedAttachments(this.app, type);
    const len = unusedAttachments.length;

    if (len <= 0) {
      new Notice(
        isChinese
          ? `所有${targetName}都在使用中，未删除任何文件。`
          : `All ${type === "image" ? "images" : "attachments"} are used. Nothing was deleted.`
      );
      return;
    }

    const modalTitle =
      type === "image"
        ? isChinese
          ? "清理未使用图片 - 预览"
          : "Clear Unused Images - Preview"
        : isChinese
        ? "清理未使用附件 - 预览"
        : "Clear Unused Attachments - Preview";
    const previewDescription = isChinese
      ? "删除后的文件将移入回收站。确认后将继续删除这些未使用文件。"
      : "Deleted files will be moved to the trash. Confirm to delete these unused files.";

    const previewModal = new ClearUnusedPreviewModal(
      modalTitle,
      previewDescription,
      unusedAttachments,
      async () => {
        let logs = isChinese
          ? `[+] ${getFormattedDate()}：开始清理。</br>`
          : `[+] ${getFormattedDate()}: Clearing started.</br>`;
        const { deletedImages, textToView } = await deleteFilesInTheList(
          unusedAttachments,
          this.settings,
          this.app
        );
        logs += textToView;
        logs += isChinese
          ? `[+] 共删除 ${deletedImages.toString()} 个${targetName}。</br>`
          : `[+] ${deletedImages.toString()} ${targetName} in total deleted.</br>`;
        logs += isChinese
          ? `[+] ${getFormattedDate()}：清理完成。`
          : `[+] ${getFormattedDate()}: Clearing completed.`;

        if (deletedImages === 0) {
          new Notice(
            isChinese
              ? "未删除任何文件。所有未使用文件都位于排除文件夹中。"
              : "No files were deleted. All unused files are inside excluded folders."
          );
          return;
        }

        if (this.settings.showOperationLogs) {
          const logModalTitle =
            type === "image"
              ? isChinese
                ? "清理未使用图片 - 日志"
                : "Clear Unused Images - Logs"
              : isChinese
              ? "清理未使用附件 - 日志"
              : "Clear Unused Attachments - Logs";
          const modal = new ClearUnusedLogsModal(logModalTitle, logs, this.app);
          modal.open();
        } else {
          new Notice(
            isChinese
              ? `已删除 ${deletedImages} 个未使用${targetName}。`
              : `Deleted ${deletedImages} unused ${targetName}.`
          );
        }
      },
      this.app
    );

    previewModal.open();
  };

  setupQueueInterval() {
    if (this.intervalId) {
      const intervalId = this.intervalId;
      this.intervalId = 0;
      window.clearInterval(intervalId);
    }
    if (this.settings.autoProcess && this.settings.autoProcessInterval > 0) {
      this.intervalId = window.setInterval(
        () => {
          void this.processModifiedQueue();
        },
        this.settings.autoProcessInterval * 1000
      );
      this.registerInterval(this.intervalId);
    }
  }

  private getCurrentNote(): TFile | null {
    try {
      const noteFile = this.app.workspace.getActiveViewOfType(MarkdownView)?.file ?? null;
      return noteFile;
    } catch {
      showBalloon(
        isChineseDisplayLanguage() ? "无法获取当前笔记！" : "Cannot get current note! ",
        true
      );
    }
    return null;
  }

  private async processPage(
    file: TFile,
    defaultdir: boolean = false,
    options: { notifyWhenUnchanged?: boolean } = {}
  ): Promise<unknown> {
    if (file == null) {
      return null;
    }

    const content = await this.app.vault.cachedRead(file);
    if (content.length == 0) {
      return null;
    }

    const fixedContent = await replaceAsync(
      content,
      MD_SEARCH_PATTERN,
      imageTagProcessor(this, file, this.settings, defaultdir)
    );

    if (content != fixedContent[0] && fixedContent[1] === false) {
      this.modifiedQueue.remove(file);
      await this.app.vault.modify(file, fixedContent[0]);

      fixedContent[2].forEach((element: string) => {
        this.newfCreatedByDownloader.push(element);
      });

      showStatusBalloon(
        isChineseDisplayLanguage()
          ? `「${file.path}」的附件已处理完成。`
          : `Attachments for "${file.path}" were processed.`,
        this.settings.showNotifications
      );
    } else if (content != fixedContent[0] && fixedContent[1] === true) {
      this.modifiedQueue.remove(file);
      await this.app.vault.modify(file, fixedContent[0]);

      fixedContent[2].forEach((element: string) => {
        this.newfCreatedByDownloader.push(element);
      });

      showBalloon(
        isChineseDisplayLanguage()
          ? `警告！\r\n「${file.path}」的附件已处理，但部分附件未能下载或替换...`
          : `WARNING!\r\nAttachments for "${file.path}" were processed, but some attachments were not downloaded/replaced...`,
        true
      );
    } else {
      if (options.notifyWhenUnchanged ?? true) {
        showStatusBalloon(
          isChineseDisplayLanguage()
            ? `「${file.path}」已处理完毕，但无任何变更。`
            : `Page "${file.path}" has been processed, but nothing was changed.`,
            this.settings.showNotifications
          );
      }
    }
  }

  processActivePage =
    (defaultdir: boolean = false) =>
    async () => {
      logError("processActivePage");
      try {
        const activeFile = this.getCurrentNote();
        await this.processPage(activeFile, defaultdir);
      } catch {
        showBalloon(
          `Please select a note or click inside selected note in canvas.`,
          true
        );
        return;
      }
    };

  processAllPages = async () => {
    const files = this.app.vault.getMarkdownFiles();

    const pagesCount = files.length;

    const notice = new Notice(
          APP_NAME +
            (isChineseDisplayLanguage()
              ? `\n开始处理。共 ${pagesCount} 页。`
              : `\nStart processing. Total ${pagesCount} pages. `),
          TIMEOUT_LIKE_INFINITY
        );

    for (const [index, file] of files.entries()) {
      if (this.ExemplaryOfMD(file.path)) {
        notice.setMessage(
          APP_NAME +
            (isChineseDisplayLanguage()
              ? `\n正在处理\n"${file.path}"\n第 ${index + 1}/${pagesCount} 页`
              : `\nProcessing \n"${file.path}" \nPage ${index} of ${pagesCount}`)
        );
        await this.processPage(file);
      }
    }
    notice.setMessage(
      APP_NAME +
        (isChineseDisplayLanguage()
          ? `\n${pagesCount} 页处理完毕。`
          : `\n${pagesCount} pages were processed.`)
    );

    window.setTimeout(() => {
      notice.hide();
    }, NOTICE_TIMEOUT);
  };

  private async onPasteFunc(
    evt: ClipboardEvent = undefined,
    editor: Editor = undefined,
    info: MarkdownView | MarkdownFileInfo = undefined
  ) {
    if (evt === undefined) {
      return;
    }

    if (!this.settings.autoProcess) {
      return;
    }

    try {
      const activeFile = this.getCurrentNote();
      const fItems = evt.clipboardData.files;
      const tItems = evt.clipboardData.items;

      if (fItems.length != 0) {
        if (activeFile && !this.ThePathExcluded(String(activeFile.parent?.path))) {
          this.pendingPastedMarkdownFile = activeFile;
          this.pendingPastedMarkdownTime = Date.now();
          this.queueAttachmentTargetNote(activeFile);
        }
        return;
      }

      if (this.ThePathExcluded(String(activeFile.parent?.path))) {
        return;
      }

      for (const item of Array.from(tItems)) {
        if (item.kind == "string") {
          if (this.settings.autoProcess) {
            const cont =
              htmlToMarkdown(evt.clipboardData.getData("text/html")) +
              htmlToMarkdown(evt.clipboardData.getData("text"));

            for (const reg_p of MD_SEARCH_PATTERN) {
              if (reg_p.test(cont)) {
                logError("content: " + cont);
                showStatusBalloon(
                  isChineseDisplayLanguage()
                    ? "检测到媒体链接，正在处理..."
                    : "Media links were found, processing...",
                  this.settings.showNotifications
                );

                this.enqueueActivePage(activeFile);
                this.setupQueueInterval();
                break;
              }
            }
          }
          return;
        }
      }
    } catch {
      showBalloon(
        isChineseDisplayLanguage()
          ? "请选择一篇笔记，或在画布中的笔记内点击。"
          : `Please select a note or click inside selected note in canvas.`,
        true
      );
      return;
    }
  }

  private removeOrphans =
    (
      type: string = undefined,
      filesToRemove: Array<TFile> = undefined,
      noteFile: TFile = undefined
    ) =>
    async () => {
      let oldRootdir = this.settings.mediaFolderPath;

      if (type == "plugin") {
        const orphanedAttachments: TFile[] = [];
        if (
          this.settings.attachmentSaveLocation != "nextToNoteS" ||
          !pathBasename(oldRootdir).endsWith("${notename}")
        ) {
          showBalloon(
            isChineseDisplayLanguage()
              ? `此命令需要启用\u201C保存在笔记旁边的指定文件夹\u201D，并且路径末尾使用\u201C\${notename}\u201D模板。\n请先修改设置！\r\n`
              : "This command requires the settings 'Next to note in the folder specified below' and pattern '${notename}' at the end to be enabled.\nPlease, change settings first!\r\n",
            true
          );
          return;
        }

        if (!noteFile) {
          noteFile = this.getCurrentNote();
          if (!noteFile) {
            showBalloon(
              isChineseDisplayLanguage()
                ? "请选择一篇笔记，或在画布中的笔记内点击后重试！"
                : "Please, select a note or click inside a note in canvas!",
              true
            );
            return;
          }
        }

        if (this.ExemplaryOfMD(noteFile.path)) {
          oldRootdir = oldRootdir.replace("${notename}", pathParse(noteFile.path)?.name);
          oldRootdir = trimAny(pathJoin([pathParse(noteFile.path)?.dir, oldRootdir]), ["/"]);
          if (!(await this.app.vault.exists(oldRootdir))) {
            showBalloon(
              isChineseDisplayLanguage()
                ? `附件文件夹 ${oldRootdir} 不存在！`
                : "The attachment folder " + oldRootdir + " does not exist!",
              true
            );
            return;
          }
          const allAttachments = this.app.vault.getAbstractFileByPath(oldRootdir)?.children;
          const referencedAttachmentNames = await this.getCurrentNoteAttachmentBaseNames(noteFile);
          if (allAttachments) {
            for (const attach of allAttachments) {
              if (attach instanceof TFile && !referencedAttachmentNames.has(attach.name)) {
                logError("orph: " + attach.basename);
                orphanedAttachments.push(attach);
              }
            }
          }

          if (orphanedAttachments.length > 0) {
            const mod = new ModalW1(this.app);
            mod.messg = (isChineseDisplayLanguage()
              ? `确认清理 ${orphanedAttachments.length} 个未关联附件，来自 '${oldRootdir}'\r\n\r\n      `
              : "Confirm clearing " +
                orphanedAttachments.length +
                " unlinked attachment(s) from '" +
                oldRootdir +
                "'\r\n\r\n      ");
            mod.plugin = this;
            mod.callbackFunc = this.removeOrphans("execremove", orphanedAttachments);
            mod.open();
          } else {
            showStatusBalloon(
              isChineseDisplayLanguage()
                ? "未找到未关联附件！"
                : "No unlinked attachments found!",
              this.settings.showNotifications
            );
          }
        }
      }

      if (type == "execremove") {
        const isChinese = isChineseDisplayLanguage();
        const msg = isChinese ? "已移入回收站。" : "were moved to the trash can.";

        if (filesToRemove) {
          filesToRemove.forEach((el: TFile) => {
            void this.app.fileManager.trashFile(el);
          });
        }

        showStatusBalloon(
          isChinese
            ? `${filesToRemove.length} 个未关联附件${msg}`
            : filesToRemove.length + " unlinked attachment(s) " + msg,
          this.settings.showNotifications
        );
      }
    };

  private openProcessAllModal = () => {
    const mod = new ModalW1(this.app);
    mod.messg = "Confirm processing all pages.\r\n ";
    mod.plugin = this;
    mod.callbackFunc = this.processAllPages;
    mod.open();
  };

  private async onMdCreateFunc(file: TFile) {
    if (
      !file ||
      !(file instanceof TFile) ||
      !this.settings.processNewMarkdown ||
      !this.ExemplaryOfMD(file.path)
    )
      return;

    const timeGapMs = Math.abs(Date.now() - file.stat.ctime);

    if (timeGapMs > RECENT_CREATED_FILE_MAX_AGE_MS) return;

    logError("func onMdCreateFunc: " + file.path);
    logError(file, true);

    let cont = await this.app.vault.cachedRead(file);

    logError(cont);

    this.latestCreatedMarkdownFile = file;
    this.enqueueActivePage(file);
    this.setupQueueInterval();
    this.setupNewMdFilesProcInterval();
  }

  private async onFCreateFunc(file: TFile) {
    if (
      !file ||
      !(file instanceof TFile) ||
      this.ExemplaryOfMD(file.path) ||
      this.ExemplaryOfCANVAS(file.path) ||
      !this.settings.processNewAttachments
    )
      return;

    if (!file.stat.ctime) return;

    const timeGapMs = Math.abs(Date.now() - file.stat.mtime);

    if (timeGapMs > RECENT_CREATED_FILE_MAX_AGE_MS) return;

    this.newfCreated.push(file.path);
    this.newfMoveReq = true;

    const activeMarkdownFile = this.app.workspace.getActiveFile();
    const pendingMarkdownFile =
      Date.now() - this.pendingPastedMarkdownTime < RECENT_CREATED_FILE_MAX_AGE_MS
        ? this.pendingPastedMarkdownFile
        : null;
    const targetMarkdownFile =
      activeMarkdownFile && this.ExemplaryOfMD(activeMarkdownFile.path)
        ? activeMarkdownFile
        : pendingMarkdownFile ?? this.latestCreatedMarkdownFile;

    this.queueAttachmentTargetNote(targetMarkdownFile);

    this.setupNewMdFilesProcInterval();
    logError("file created  ");
  }

  private ExemplaryOfMD(pat: string) {
    const includeRegex = new RegExp(this.settings.includePatternRegex, "i");
    return pat.match(includeRegex)?.groups?.md != undefined;
  }

  private ExemplaryOfCANVAS(pat: string) {
    const includeRegex = new RegExp(this.settings.includePatternRegex, "i");
    return pat.match(includeRegex)?.groups?.canvas != undefined;
  }

  private ThePathExcluded(pat: string) {
    const includeRegex = new RegExp(this.settings.excludedFoldersRegexp, "i");
    logError(pat.match(includeRegex));
    return (
      pat.match(includeRegex) != null && trimAny(this.settings.excludedFolders, [" "]).length != 0
    );
  }

  private processMdFilesOnTimer = async () => {
    const onRet = () => {
      this.newfCreated = [];
      this.newfCreatedByDownloader = [];
      this.noteModified = [];
      this.newfMoveReq = false;
      this.pendingPastedMarkdownFile = null;
      this.pendingPastedMarkdownTime = 0;
      window.clearInterval(this.newfProcInt);
      this.newfProcInt = 0;
    };

    logError("func processMdFilesOnTimer:\r\n");
    logError(this.noteModified, true);

    try {
      window.clearInterval(this.newfProcInt);
      this.newfProcInt = 0;
      this.newfMoveReq = false;
      let itemcount = 0;
      const useMdLinks = this.app.vault.getConfig("useMarkdownLinks");

      for (let note of this.noteModified) {
        const metaCache = this.app.metadataCache.getFileCache(note);
        let filedata = await this.app.vault.cachedRead(note);

        let pr = false;
        for (const reg_p of MD_SEARCH_PATTERN) {
          if (reg_p.test(filedata)) {
            pr = true;
            break;
          }
        }

        const mdir = await getMDir(this.app, note, this.settings);
        const obsmdir = await getMDir(this.app, note, this.settings, true);
        const embeds = this.getEmbeddedAttachments(metaCache?.embeds, filedata);

        if (obsmdir != "" && !(await this.app.vault.adapter.exists(obsmdir))) {
          if (!this.settings.skipObsidianFolderCreation) {
            void this.ensureFolderExists(obsmdir);
            showStatusBalloon(
              "You obsidian media folder set to '" +
                obsmdir +
                "', and has been created by the plugin. Please, try again. ",
              this.settings.showNotifications
            );
            onRet();
          }
          return;
        }

        if (embeds.length > 0 || pr) {
          await this.ensureFolderExists(mdir);

          for (let el of embeds) {
            logError(el);

            let oldpath = pathJoin([obsmdir, pathBasename(el.link)]);
            let oldtag = el.original;
            logError(useMdLinks);

            logError(this.newfCreated);

            let isMatch =
              this.newfCreated.indexOf(el.link) != -1 ||
              this.newfCreated.includes(oldpath) ||
              this.newfCreated.some((p) => pathBasename(p) === pathBasename(el.link));

            if (isMatch && !this.newfCreatedByDownloader.includes(oldtag)) {
              if (!(await this.app.vault.adapter.exists(oldpath))) {
                logError("Cannot find " + el.link + " skipping...");
                continue;
              }

              let newpath = pathJoin([mdir, cFileName(pathBasename(el.link))]);
              let newlink: [string, string, Record<string, string>] = await getRDir(note, this.settings, newpath);

              logError(el.link);

              let newBinData: ArrayBuffer | null = null;
              let newMD5: string | null = null;
              const oldBinData = await this.app.vault.adapter.readBinary(oldpath);
              const oldMD5 = md5Sig(oldBinData);
              const fileExt = await getFileExt(oldBinData, oldpath);

              logError("oldbindata size: " + oldBinData.byteLength);
              logError("oldext: " + fileExt);

              if (this.settings.compressImage && fileExt == "png") {
                let compType = "image/jpg";
                let compExt = ".jpg";

                if (this.settings.compressionFormat == "image/webp") {
                  compType = "image/webp";
                  compExt = ".webp";
                }

                logError("Compressing image to ");

                const blob = new Blob([
                  new Uint8Array(await this.app.vault.adapter.readBinary(oldpath)),
                ]);
                newBinData = await blobToJpegArrayBuffer(
                  blob,
                  this.settings.compressionQuality * 0.01,
                  compType
                );

                newMD5 = md5Sig(newBinData);
                logError(newBinData);
                if (newBinData != null) {
                  const duplicateFile = await this.findDuplicateAttachmentByHash(
                    mdir,
                    newMD5,
                    oldpath
                  );

                  if (duplicateFile) {
                    newpath = duplicateFile.path;
                  } else if (this.settings.useTimestampNaming) {
                    newpath = await this.buildTimestampedAttachmentPath(mdir, compExt, newMD5);
                  } else {
                    newpath = pathJoin([mdir, cFileName(pathParse(el.link)?.name + compExt)]);
                  }
                  newlink = await getRDir(note, this.settings, newpath);
                }
              } else if (
                (IMAGE_EXTENSIONS.has(fileExt) && this.settings.useTimestampNaming) ||
                (!IMAGE_EXTENSIONS.has(fileExt) && this.settings.useTimestampNamingForAttachments)
              ) {
                const duplicateFile = await this.findDuplicateAttachmentByHash(
                  mdir,
                  oldMD5,
                  oldpath
                );
                if (duplicateFile) {
                  newpath = duplicateFile.path;
                } else {
                  newpath = await this.buildTimestampedAttachmentPath(
                    mdir,
                    pathExtname(el.link),
                    oldMD5
                  );
                }
                newlink = await getRDir(note, this.settings, newpath);
              } else {
                newpath = pathJoin([mdir, cFileName(pathBasename(el.link))]);
                newlink = await getRDir(note, this.settings, newpath);
              }

              if (await this.app.vault.adapter.exists(newpath)) {
                let newFMD5;
                if (newBinData != null) {
                  newFMD5 = md5Sig(await this.app.vault.adapter.readBinary(newpath));
                } else {
                  newFMD5 = md5Sig(await this.app.vault.adapter.readBinary(newpath));
                }

                if (newMD5 === newFMD5 || (oldMD5 === newFMD5 && oldpath != newpath)) {
                  logError(pathDirname(oldpath));
                  logError("Deleting duplicate file: " + oldpath);
                  await this.app.vault.adapter.remove(oldpath);
                } else if (oldpath != newpath) {
                  logError("Renaming existing: " + oldpath);
                  let inc = 1;
                  while (await this.app.vault.adapter.exists(newpath)) {
                    newpath = pathJoin([mdir, `(${inc}) ` + cFileName(pathBasename(el.link))]);
                    inc++;
                  }

                  newlink = await getRDir(note, this.settings, newpath);
                  await this.app.vault.adapter.rename(oldpath, newpath);
                }
              } else {
                logError(`renaming  ${oldpath}  to  ${newpath}`);
                try {
                  if (newBinData != null) {
                    await this.app.vault.adapter.writeBinary(newpath, newBinData).then();
                    {
                      await this.app.vault.adapter.remove(oldpath);
                    }
                  } else {
                    await this.app.vault.adapter.rename(oldpath, newpath);
                  }
                } catch (error) {
                  logError(error);
                }
              }

              let addName = "";
              if (this.settings.appendOriginalName) {
                if (useMdLinks) {
                  addName = `[Open: ${pathBasename(el.link)}](${newlink[1]})\r\n`;
                } else {
                  addName = `[[${newlink[0]}|Open: ${pathBasename(el.link)}]]\r\n`;
                }
              }

              let newtag = addName + oldtag.replace(el.link, newlink[0]);

              if (useMdLinks) {
                newtag = addName + oldtag.replace(encObsURI(el.link), newlink[1]);
              }

              filedata = filedata.replaceAll(oldtag, newtag);
              itemcount++;
            }
          }
        }
        if (itemcount > 0) {
          await this.app.vault.modify(note, filedata);
          showStatusBalloon(
            isChineseDisplayLanguage()
              ? `${itemcount} 个附件（笔记：${note.path}）已处理完成。`
              : itemcount + " attachments for note " + note.path + " were processed.",
            this.settings.showNotifications
          );
          itemcount = 0;
        }
      }
    } catch (e) {
      logError(e);
      onRet();
    }
    onRet();
  };

  setupNewMdFilesProcInterval() {
    logError("func setupNewFilesProcInterval: \r\n");
    window.clearInterval(this.newfProcInt);
    this.newfProcInt = 0;
    this.newfProcInt = window.setInterval(
      () => {
        void this.processMdFilesOnTimer();
      },
      this.settings.autoProcessInterval * 1000
    );
    this.registerInterval(this.newfProcInt);
  }

  processModifiedQueue = async () => {
    const iteration = this.modifiedQueue.iterationQueue();
    for (const page of iteration) {
      void this.processPage(page, false, { notifyWhenUnchanged: false });
    }
  };

  enqueueActivePage(activeFile: TFile) {
    this.modifiedQueue.push(
      activeFile,
      1
    );
  }

  onunload() {
    this.previewFeature?.onunload();
    logError(" unloaded.");
  }

  async loadSettings() {
    const savedSettings = ((await this.loadData()) ?? {}) as ISettings;
    const migratedSettings = { ...savedSettings };

    this.settings = Object.assign({}, DEFAULT_SETTINGS, migratedSettings);
    this.setupQueueInterval();
  }

  async saveSettings() {
    try {
      await this.saveData(this.settings);
    } catch (error) {
      if (error instanceof Error) {
        displayError(error);
      } else {
        displayError(String(error));
      }
    }
  }

  async ensureFolderExists(folderPath: string) {
    try {
      await this.app.vault.createFolder(folderPath);
      return;
    } catch (e) {
      logError(e);
      return;
    }
  }
}
