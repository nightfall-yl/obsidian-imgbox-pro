import {
  App,
  Notice,
  Platform,
  PluginSettingTab,
  Setting,
  SettingGroup,
  TFile,
  setIcon,
} from "obsidian";

import { displayError, logError, trimAny } from "./utils";

import { APP_NAME } from "./config";

import LocalImagesPlugin from "./main";
import { getMDir, getRDir } from "./contentProcessor";
import { generateTimestampRandomName, pathJoin } from "./utils";

type SettingsSection = {
  id: string;
  label: string;
  icon: string;
};

/** Detect Obsidian's display language */
function getObsidianLang(): "zh-CN" | "en" {
  const lang = document.documentElement.lang?.toLowerCase() ?? "";
  return lang.startsWith("zh") ? "zh-CN" : "en";
}

const LOCALE_TEXT: Record<string, Record<string, string>> = {
  "zh-CN": {
    navLocalize: "图片本地化",
    navPreview: "图片管理",
    subgroupAutoTriggerTitle: "自动触发",
    subgroupGlobalTitle: "界面与全局",
    subgroupPreviewTitle: "图片预览",
    subgroupCleanupTitle: "图片清理",
    showNotifications: "显示通知",
    showNotificationsDesc: "控制成功和状态提示是否弹出；错误提示仍会显示。",
    showCleanupRibbon: "显示图片清理 Ribbon 图标",
    showCleanupRibbonDesc:
      "在左侧功能区显示图片清理快捷按钮。它是\u201cClear Unused Images in Vault\u201d的快捷入口，按钮文案会跟随 Obsidian 显示语言切换。",
    autoProcess: "自动处理",
    autoProcessDesc: "在新建、复制和粘贴时自动处理笔记。",
    autoProcessInterval: "自动处理间隔",
    autoProcessIntervalDesc: "自动处理的时间间隔，单位为秒。",
    autoProcessIntervalInvalid: "请输入 3 到 3600 之间的正整数！",
    processNewMarkdown: "处理所有新建 Markdown 文件",
    processNewMarkdownDesc: "处理新建或同步得到的 Markdown 类文件。",
    processNewAttachments: "处理所有新附件",
    processNewAttachmentsDesc: "将所有新附件从 Obsidian 默认附件目录移动到插件管理的位置。",
    useTimestampNaming: "新图片使用时间+MD5命名",
    useTimestampNamingDesc:
      "对新粘贴或拖入的图片使用 YYYYMMDD-HHmmss-md5前6位 命名，同时保留去重能力。",
    useTimestampNamingForAttachments: "新附件使用时间+MD5命名",
    useTimestampNamingForAttachmentsDesc:
      "对新粘贴或拖入的非图片附件使用 YYYYMMDD-HHmmss-md5前6位 命名，同时保留去重能力。",
    subgroupDownloadTitle: "下载行为",
    subgroupCompressionTitle: "图片压缩",
    subgroupNamingTitle: "命名与链接",
    subgroupStorageNamingTitle: "存储命名",
    downloadRetryCount: "单个附件重试次数",
    downloadRetryCountDesc: "下载附件失败时的重试次数。",
    downloadRetryCountInvalid: "请输入 1 到 6 之间的正整数！",
    downloadUnknownTypes: "下载未知文件类型",
    downloadUnknownTypesDesc: "下载未知文件类型，并以 `.unknown` 扩展名保存。",
    compressImage: "压缩图片",
    compressImageDesc: "压缩下载和粘贴得到的图片。可以减小体积，但也可能影响性能。",
    compressionFormat: "压缩格式",
    compressionFormatDesc: "选择图片压缩后的输出格式。",
    compressionQuality: "图片质量",
    compressionQualityDesc: "图片质量范围为 10 到 100。",
    compressionQualityInvalid: "请输入 10 到 100 之间的正整数！",
    minFileSizeKB: "文件大小下限（KB）",
    minFileSizeKBDesc: "不下载小于该大小的文件。设为 0 表示不限制。",
    positiveIntegerInvalid: "请输入正整数！",
    excludedExtensions: "排除扩展名",
    excludedExtensionsDesc: "插件不会下载这些扩展名的附件。",
    preserveCaptions: "保留链接标题",
    preserveCaptionsDesc: "在转换后的标签中保留媒体链接标题。",
    appendOriginalName: "添加原始文件名或打开文件标签",
    appendOriginalNameDesc: "对本地文件或拖入文件，在替换后的标签后追加原始文件名。",
    linkPathFormat: "标签中的路径写法",
    linkPathFormatDesc: "选择写入完整路径、相对路径，或仅写文件名。",
    fullPath: "完整路径",
    relativePath: "相对于笔记",
    filenameOnly: "仅文件名",
    unsafeFolderName: "文件夹名称不安全！某些字符在部分文件系统中不可用。",
    attachmentSaveLocation: "新附件保存位置",
    attachmentSaveLocationDesc:
      "选择所有新附件的保存位置。可使用 `_resources/${notename}` 这类模板。",
    followObsidian: "跟随 Obsidian 设置",
    saveToRoot: "保存到下方指定的根目录",
    saveNextToNote: "保存在笔记旁边的指定文件夹",
    syncMediaFolder: "同步移动、删除或重命名媒体文件夹",
    syncMediaFolderDesc: "当关联笔记发生变化时，同时移动或重命名媒体文件夹。请谨慎使用。",
    mediaFolderPath: "媒体文件夹",
    mediaFolderPathDesc: "用于存放下载媒体文件的文件夹。",
    localizeAdvancedTitle: "高级选项",
    skipObsidianFolderCreation: "不创建 Obsidian 附件文件夹",
    skipObsidianFolderCreationDesc: "用于兼容其他插件，但可能导致部分工作流行为异常。",
    deleteDestination: "删除去向",
    deleteDestinationDesc: "选择删除未使用图片、附件或笔记时的文件去向。",
    deletePermanent: "永久删除",
    deleteObsidianTrash: "移动到 Obsidian 回收站",
    deleteSystemTrash: "移动到系统回收站",
    deletePermanentWarning: "⚠ 永久删除不可恢复！请谨慎操作。",
    showOperationLogs: "显示操作日志弹窗",
    showOperationLogsDesc: "操作完成后弹出包含操作详情的日志窗口。",
    excludeSubfolders: "清理时排除子文件夹",
    excludeSubfoldersDesc:
      "启用后，被排除的文件夹及其所有子文件夹在\u201c图片清理\u201d时都会被跳过。",
    excludedFolders: "排除文件夹",
    excludedFoldersDesc: "这些文件夹中的文件不会被自动处理，\u201c图片清理\u201d也会跳过它们。",
    excludedFoldersPlaceholder: "每行输入一个完整路径，例如 RootFolder/Subfolder",
    clickPreviewEnabled: "单击预览图片",
    clickPreviewEnabledDesc:
      "单击图片中间区域可打开可缩放的预览视图，再次单击可关闭预览。",
    previewMobileDesc: "移动端使用 Obsidian 内置图片查看器，无需额外配置。",
    previewAdaptiveRatio: "自适应显示比例",
    previewAdaptiveRatioDesc: "当预览图片大于窗口时，按设定比例自适应缩放。",
    previewAdaptiveRatioNotice: "自适应比例",
    configPreviewTitle: "当前配置预览",
    configPreviewHint: "会按当前设置和当前笔记动态计算。",
    previewCurrentNote: "当前笔记",
    previewAttachmentDir: "最终附件目录",
    previewLinkExample: "链接写法示例",
    previewNameExample: "命名示例",
    previewImageNameExample: "图片",
    previewAttachmentNameExample: "附件",
    previewFallbackNote: "示例/示例笔记.md",
    commandPaletteSummary: "查看命令面板入口说明（默认固定显示）",
    cmdLocalizeObsidian: "本地化当前笔记附件（Obsidian 位置）",
    cmdLocalizeObsidianDesc: "将当前笔记中的外部图片链接（网页 URL、base64）下载到 Obsidian 默认的附件目录，并自动改写笔记中的链接指向本地文件。",
    cmdLocalizePlugin: "本地化当前笔记附件（自定义位置）",
    cmdLocalizePluginDesc: "将当前笔记中的外部图片链接（网页 URL、base64）下载到插件管理的目录（如 _resources/笔记名/），并自动改写笔记中的链接指向本地文件。",
    cmdBatchLocalize: "批量本地化所有笔记的附件",
    cmdBatchLocalizeDesc: "遍历整个 vault 的所有 .md 文件，按照你设置的附件保存位置处理每篇笔记中的外部链接。适合首次安装时做历史数据迁移或定期维护。",
    cmdClearImages: "清理库中未引用的图片（Ribbon 栏）",
    cmdClearImagesDesc: "扫描全库所有 .md 文件的引用关系，找出未被任何笔记引用的孤立图片文件并删除或移入回收站。仅处理图片类型。此命令也是 Ribbon 按钮的默认操作。",
    cmdClearAttachments: "清理库中未引用的附件（全库）",
    cmdClearAttachmentsDesc: "同上逻辑，但范围更广——不仅包含图片，还清理 PDF、ZIP、MP3、MP4 等所有非图片类型的孤立附件。面向整个 vault。",
    cmdClearOrphans: "清理当前笔记文件夹中的孤立附件（笔记旁模式）",
    cmdClearOrphansDesc: "仅当附件保存方式为「保存在笔记旁边」且模板以 ${notename} 结尾时可用。只扫描当前笔记对应的附件子文件夹，删除其中未被引用的文件。",
  },
  en: {
    navLocalize: "Localize",
    navPreview: "Image Management",
    subgroupAutoTriggerTitle: "Auto Trigger",
    subgroupGlobalTitle: "UI & Global",
    subgroupPreviewTitle: "Image Preview",
    subgroupCleanupTitle: "Image Cleanup",
    showNotifications: "Show notifications",
    showNotificationsDesc: "Control whether success and status toasts appear. Errors will still show.",
    showCleanupRibbon: "Show cleanup Ribbon icon",
    showCleanupRibbonDesc:
      'Show the cleanup shortcut in the left Ribbon. It is a shortcut for "Clear Unused Images in Vault", and its label follows Obsidian\'s display language.',
    autoProcess: "Automatic processing",
    autoProcessDesc: "Automatically process notes on create, copy, and paste.",
    autoProcessInterval: "Automatic processing interval",
    autoProcessIntervalDesc: "The interval for automatic processing, in seconds.",
    autoProcessIntervalInvalid: "Please enter an integer between 3 and 3600.",
    processNewMarkdown: "Process all new Markdown files",
    processNewMarkdownDesc: "Process newly created or synced Markdown-like files.",
    processNewAttachments: "Process all new attachments",
    processNewAttachmentsDesc:
      "Move new attachments from the default Obsidian attachment folder into the plugin-managed location.",
    useTimestampNaming: "Use time + MD5 names for new images",
    useTimestampNamingDesc:
      "Rename newly pasted or dropped images as YYYYMMDD-HHmmss-md5-first-6 while keeping deduplication.",
    useTimestampNamingForAttachments: "Use time + MD5 names for new attachments",
    useTimestampNamingForAttachmentsDesc:
      "Rename newly pasted or dropped non-image attachments as YYYYMMDD-HHmmss-md5-first-6 while keeping deduplication.",
    subgroupDownloadTitle: "Download Behavior",
    subgroupCompressionTitle: "Image Compression",
    subgroupNamingTitle: "Naming & Links",
    subgroupStorageNamingTitle: "Storage & Naming",
    downloadRetryCount: "Retry count per attachment",
    downloadRetryCountDesc: "How many times to retry when attachment downloads fail.",
    downloadRetryCountInvalid: "Please enter an integer between 1 and 6.",
    downloadUnknownTypes: "Download unknown file types",
    downloadUnknownTypesDesc:
      "Download unknown types and save them with the `.unknown` extension.",
    compressImage: "Compress images",
    compressImageDesc:
      "Compress downloaded and pasted images. This can reduce file size but may affect performance.",
    compressionFormat: "Compression format",
    compressionFormatDesc: "Choose the output format for image compression.",
    compressionQuality: "Image quality",
    compressionQualityDesc: "Image quality from 10 to 100.",
    compressionQualityInvalid: "Please enter an integer between 10 and 100.",
    minFileSizeKB: "File size lower limit (KB)",
    minFileSizeKBDesc: "Do not download files smaller than this value. Set 0 to disable the limit.",
    positiveIntegerInvalid: "Please enter a positive integer.",
    excludedExtensions: "Excluded extensions",
    excludedExtensionsDesc: "The plugin will not download attachments with these extensions.",
    preserveCaptions: "Preserve link captions",
    preserveCaptionsDesc: "Preserve media link captions in converted tags.",
    appendOriginalName: "Add original filename or open-file tag",
    appendOriginalNameDesc:
      "Append the original filename after the replaced tag for local or dropped files.",
    linkPathFormat: "Path format in tags",
    linkPathFormatDesc: "Choose whether to write full paths, relative paths, or filenames only.",
    fullPath: "Full path",
    relativePath: "Relative to note",
    filenameOnly: "Filename only",
    unsafeFolderName:
      "Unsafe folder name. Some characters are not supported on certain file systems.",
    attachmentSaveLocation: "Save location for new attachments",
    attachmentSaveLocationDesc:
      "Choose where new attachments are stored. Templates like `_resources/${notename}` are supported.",
    followObsidian: "Follow Obsidian settings",
    saveToRoot: "Save to the root folder specified below",
    saveNextToNote: "Save in the specified folder next to the note",
    syncMediaFolder: "Move, delete, or rename media folder together",
    syncMediaFolderDesc:
      "When the related note changes, also move or rename the media folder. Use with caution.",
    mediaFolderPath: "Media folder",
    mediaFolderPathDesc: "Folder used to store downloaded media files.",
    localizeAdvancedTitle: "Advanced options",
    skipObsidianFolderCreation: "Do not create Obsidian attachment folder",
    skipObsidianFolderCreationDesc:
      "Improves compatibility with other plugins, but may affect some workflows.",
    deleteDestination: "Delete destination",
    deleteDestinationDesc:
      "Choose where deleted files go when removing unused images, attachments, or notes.",
    deletePermanent: "Delete permanently",
    deleteObsidianTrash: "Move to Obsidian Trash",
    deleteSystemTrash: "Move to System Trash",
    deletePermanentWarning: "⚠ Permanent deletion cannot be undone! Please be careful.",
    showOperationLogs: "Show operation log modal",
    showOperationLogsDesc: "Show a log modal with details after operations complete.",
    excludeSubfolders: "Exclude subfolders during cleanup",
    excludeSubfoldersDesc:
      "When enabled, excluded folders and all their subfolders are skipped during image cleanup.",
    excludedFolders: "Excluded folders",
    excludedFoldersDesc:
      "Files inside these folders will not be processed automatically, and image cleanup will skip them too.",
    excludedFoldersPlaceholder: "Enter one full path per line, for example RootFolder/Subfolder",
    clickPreviewEnabled: "Click to preview image",
    clickPreviewEnabledDesc:
      "Click the center area of an image to open a zoomable preview, and click again to close it.",
    previewMobileDesc: "Mobile uses the built-in Obsidian image viewer. No configuration needed.",
    previewAdaptiveRatio: "Adaptive display ratio",
    previewAdaptiveRatioDesc:
      "When the preview image is larger than the window, scale it adaptively.",
    previewAdaptiveRatioNotice: "Adaptive ratio",
    configPreviewTitle: "Current configuration preview",
    configPreviewHint: "This is calculated from the current settings and active note.",
    previewCurrentNote: "Current note",
    previewAttachmentDir: "Final attachment folder",
    previewLinkExample: "Link example",
    previewNameExample: "Naming example",
    previewImageNameExample: "Image",
    previewAttachmentNameExample: "Attachment",
    previewFallbackNote: "Example/Example Note.md",
    commandPaletteSummary: "View command palette entry descriptions (always shown)",
    cmdLocalizeObsidian: "Localize attachments for the current note (Obsidian location)",
    cmdLocalizeObsidianDesc:
      "Download external image links (web URLs, base64) in the current note to the Obsidian default attachment directory, and automatically rewrite links to point to local files.",
    cmdLocalizePlugin: "Localize attachments for the current note (custom location)",
    cmdLocalizePluginDesc:
      "Download external image links (web URLs, base64) in the current note to a plugin-managed directory (e.g. _resources/${notename}/), and automatically rewrite links to point to local files.",
    cmdBatchLocalize: "Localize attachments for all your notes",
    cmdBatchLocalizeDesc:
      "Traverse every .md file in the vault and process external links according to your configured attachment save location. Ideal for first-time setup or periodic maintenance.",
    cmdClearImages: "Clear Unused Images in Vault (Ribbon)",
    cmdClearImagesDesc:
      "Scan all .md files in the vault for references and remove unreferenced orphaned image files (delete or move to trash). Only handles image types. This is also the default action of the Ribbon button.",
    cmdClearAttachments: "Clear Unused Attachments in Vault (all types)",
    cmdClearAttachmentsDesc:
      "Same logic but broader scope — cleans up all non-image orphaned types as well (PDF, ZIP, MP3, MP4, etc.). Scans the entire vault.",
    cmdClearOrphans: "Clear Unlinked Attachments in Current Note Folder (Next to Note mode)",
    cmdClearOrphansDesc:
      "Only available when save location is \"next to note\" and the folder template ends with ${notename}. Scans only the current note's attachment subfolder for unreferenced files.",
  },
};

export default class SettingTab extends PluginSettingTab {
  plugin: LocalImagesPlugin;

  constructor(app: App, plugin: LocalImagesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private updateDeleteDangerWarning(
    warningEl: HTMLElement,
    value: string,
    t: (key: string) => string
  ): void {
    if (value === "permanent") {
      warningEl.style.display = "flex";
      warningEl.setText(t("deletePermanentWarning"));
    } else {
      warningEl.style.display = "none";
    }
  }

  private toggleCompressionOptions(containerEl: HTMLElement, isVisible: boolean): void {
    if (isVisible) {
      containerEl.removeClass("is-hidden");
      containerEl.style.display = "";
      containerEl.style.maxHeight = containerEl.scrollHeight + "px";
      containerEl.style.opacity = "1";
      containerEl.style.marginTop = "";
    } else {
      containerEl.addClass("is-hidden");
      containerEl.style.maxHeight = "0";
      containerEl.style.opacity = "0";
      containerEl.style.marginTop = "0";
      containerEl.style.overflow = "hidden";
      setTimeout(() => {
        if (containerEl.hasClass("is-hidden")) {
          containerEl.style.display = "none";
        }
      }, 200);
    }
  }

  private addSetting(
    group: SettingGroup | HTMLElement,
    configure: (setting: Setting) => void
  ): void {
    if (group instanceof SettingGroup) {
      group.addSetting(configure);
      return;
    }

    configure(new Setting(group));
  }

  private createSetting(group: SettingGroup | HTMLElement): Setting {
    if (!(group instanceof SettingGroup)) {
      return new Setting(group);
    }

    let createdSetting: Setting | undefined;
    group.addSetting((setting) => {
      createdSetting = setting;
    });

    if (!createdSetting) {
      throw new Error("Failed to create setting inside SettingGroup.");
    }

    return createdSetting;
  }

  private addNumberSetting(
    group: SettingGroup | HTMLElement,
    options: {
      name: string;
      desc: string;
      value: number;
      min?: number;
      max?: number;
      integer?: boolean;
      emptyAs?: number | null;
      onValidChange: (value: number) => Promise<void>;
      invalidMessage: string;
    }
  ): Setting {
    const setting = this.createSetting(group);
    setting
      .setName(options.name)
      .setDesc(options.desc)
      .addText((text) =>
        text.setValue(String(options.value)).onChange(async (value: string) => {
          const trimmed = value.trim();
          if (trimmed === "" && options.emptyAs !== undefined) {
            await options.onValidChange(options.emptyAs ?? 0);
            return;
          }

          const numberValue = Number(trimmed);
          const isInteger = options.integer ?? true;
          const min = options.min ?? Number.NEGATIVE_INFINITY;
          const max = options.max ?? Number.POSITIVE_INFINITY;

          if (
            Number.isNaN(numberValue) ||
            (isInteger && !Number.isInteger(numberValue)) ||
            numberValue < min ||
            numberValue > max
          ) {
            displayError(options.invalidMessage);
            return;
          }

          await options.onValidChange(numberValue);
        })
      );

    return setting;
  }

  private createSettingGroup(containerEl: HTMLElement, heading: string): SettingGroup {
    return new SettingGroup(containerEl).setHeading(heading);
  }

  private getPreviewNoteFile(): TFile {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (activeFile instanceof TFile && activeFile.extension === "md") {
      return activeFile;
    }

    return {
      basename: "Example Note",
      path: "Example/Example Note.md",
      parent: { path: "Example" },
    } as TFile;
  }

  private async buildConfigPreview(fallbackNoteLabel: string): Promise<{
    noteLabel: string;
    attachmentDir: string;
    linkExample: string;
    imageNameExample: string;
    attachmentNameExample: string;
  }> {
    const noteFile = this.getPreviewNoteFile();
    const exampleDate = new Date(2026, 4, 28, 12, 34, 56);
    const attachmentDir = await getMDir(this.plugin.app, noteFile, this.plugin.settings);
    const sampleImagePath = pathJoin([
      attachmentDir,
      generateTimestampRandomName("png", "abcdef123456_MD5", exampleDate),
    ]);
    const sampleLink = await getRDir(
      noteFile,
      this.plugin.settings,
      sampleImagePath,
      "https://example.com/sample.png"
    );
    const useMdLinks = this.plugin.app.vault.getConfig("useMarkdownLinks");

    return {
      noteLabel: noteFile.path || fallbackNoteLabel,
      attachmentDir,
      linkExample: useMdLinks ? `![示例](${sampleLink[1]})` : `![[${sampleLink[0]}]]`,
      imageNameExample: generateTimestampRandomName("png", "abcdef123456_MD5", exampleDate),
      attachmentNameExample: generateTimestampRandomName("pdf", "abcdef123456_MD5", exampleDate),
    };
  }

  private createConfigPreview(
    containerEl: HTMLElement,
    t: (key: string) => string
  ): { wrapper: HTMLElement; refresh: () => Promise<void> } {
    const wrapper = containerEl.createDiv({ cls: "lip-config-preview" });
    const header = wrapper.createDiv({ cls: "lip-config-preview-header" });
    header.createDiv({ text: t("configPreviewTitle"), cls: "lip-config-preview-title" });
    header.createDiv({ text: t("configPreviewHint"), cls: "lip-config-preview-hint" });

    const rows = wrapper.createDiv({ cls: "lip-config-preview-rows" });

    const noteRow = rows.createDiv({ cls: "lip-config-preview-row" });
    noteRow.createDiv({ text: t("previewCurrentNote"), cls: "lip-config-preview-label" });
    const noteValue = noteRow.createDiv({ cls: "lip-config-preview-value" });

    const dirRow = rows.createDiv({ cls: "lip-config-preview-row" });
    dirRow.createDiv({ text: t("previewAttachmentDir"), cls: "lip-config-preview-label" });
    const dirValue = dirRow.createDiv({ cls: "lip-config-preview-value" });

    const linkRow = rows.createDiv({ cls: "lip-config-preview-row" });
    linkRow.createDiv({ text: t("previewLinkExample"), cls: "lip-config-preview-label" });
    const linkValue = linkRow.createDiv({
      cls: "lip-config-preview-value lip-config-preview-mono",
    });

    const nameRow = rows.createDiv({ cls: "lip-config-preview-row" });
    nameRow.createDiv({ text: t("previewNameExample"), cls: "lip-config-preview-label" });
    const nameValue = nameRow.createDiv({
      cls: "lip-config-preview-value lip-config-preview-mono",
    });

    const refresh = async () => {
      const preview = await this.buildConfigPreview(t("previewFallbackNote"));
      noteValue.setText(preview.noteLabel);
      dirValue.setText(preview.attachmentDir);
      linkValue.setText(preview.linkExample);
      nameValue.setText(
        `${t("previewImageNameExample")}: ${preview.imageNameExample} | ${t("previewAttachmentNameExample")}: ${preview.attachmentNameExample}`
      );
    };

    return { wrapper, refresh };
  }

  private createCommandDetails(
    containerEl: HTMLElement,
    summary: string,
    commands: Array<{ name: string; desc: string }>
  ): void {
    const detailsEl = containerEl.createEl("details", { cls: "lip-command-details" });
    detailsEl.createEl("summary", { text: summary });
    const listEl = detailsEl.createDiv({ cls: "lip-command-details-list" });

    for (const command of commands) {
      const itemEl = listEl.createDiv({ cls: "lip-command-details-item" });
      itemEl.createDiv({ text: command.name, cls: "lip-command-details-name" });
      itemEl.createDiv({ text: command.desc, cls: "lip-command-details-desc" });
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("lip-settings-root");
    const lang = getObsidianLang();
    const t = (key: string) => LOCALE_TEXT[lang][key] ?? key;

    containerEl.createEl("h1", { text: APP_NAME });
    const sections: SettingsSection[] = [
      { id: "localize", label: t("navLocalize"), icon: "panel-left" },
      { id: "preview", label: t("navPreview"), icon: "image" },
    ];

    const navEl = containerEl.createDiv({ cls: "lip-settings-nav" });
    const contentEl = containerEl.createDiv({ cls: "lip-settings-content" });
    const sectionEls = new Map<string, HTMLElement>();
    const navButtons = new Map<string, HTMLButtonElement>();

    const setActiveSection = (sectionId: string) => {
      sectionEls.forEach((sectionEl, id) => {
        sectionEl.toggleClass("is-active", id === sectionId);
      });
      navButtons.forEach((button, id) => {
        button.toggleClass("is-active", id === sectionId);
      });
    };

    sections.forEach((section, index) => {
      const button = navEl.createEl("button", {
        cls: "lip-settings-nav-btn",
        attr: { type: "button" },
      });
      const iconEl = button.createSpan({ cls: "lip-settings-nav-icon" });
      setIcon(iconEl, section.icon);
      button.createSpan({ text: section.label });
      button.addEventListener("click", () => setActiveSection(section.id));
      navButtons.set(section.id, button);

      const sectionEl = contentEl.createDiv({ cls: "lip-settings-section" });
      sectionEls.set(section.id, sectionEl);
      if (index === 0) {
        sectionEl.addClass("is-active");
        button.addClass("is-active");
      }
    });

    // ===================== 图片本地化 =====================
    const localizeEl = sectionEls.get("localize")!;
    const configPreview = this.createConfigPreview(localizeEl, t);
    void configPreview.refresh();

    const updateAutoProcessSettings = () => {
      const shouldDisable = !this.plugin.settings.autoProcess;
      autoProcessIntervalSetting.setDisabled(shouldDisable);
      processNewMarkdownSetting.setDisabled(shouldDisable);
      processNewAttachmentsSetting.setDisabled(shouldDisable);
    };

    const updateAttachmentFolderSettings = () => {
      const shouldHide =
        this.plugin.settings.attachmentSaveLocation === "obsFolder" ||
        this.plugin.settings.attachmentSaveLocation === "nextToNoteS";
      localizeEl
        .querySelectorAll<HTMLElement>('[data-lip-conditional="attachment-folder"]')
        .forEach((el) => el.toggleClass("lip-conditional-hidden", shouldHide));
    };

    // ── 自动触发 ──
    const triggerGroupEl = this.createSettingGroup(localizeEl, t("subgroupAutoTriggerTitle"));

    const autoProcessSetting = this.createSetting(triggerGroupEl)
      .setName(t("autoProcess"))
      .setDesc(t("autoProcessDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoProcess).onChange(async (value) => {
          this.plugin.settings.autoProcess = value;
          await this.plugin.saveSettings();
          this.plugin.setupQueueInterval();
          updateAutoProcessSettings();
        })
      );

    const autoProcessIntervalSetting = this.addNumberSetting(triggerGroupEl, {
      name: t("autoProcessInterval"),
      desc: t("autoProcessIntervalDesc"),
      value: this.plugin.settings.autoProcessInterval,
      min: 3,
      max: 3600,
      integer: true,
      onValidChange: async (value) => {
        this.plugin.settings.autoProcessInterval = value;
        await this.plugin.saveSettings();
        this.plugin.setupQueueInterval();
      },
      invalidMessage: t("autoProcessIntervalInvalid"),
    });

    const processNewMarkdownSetting = this.createSetting(triggerGroupEl)
      .setName(t("processNewMarkdown"))
      .setDesc(t("processNewMarkdownDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.processNewMarkdown).onChange(async (value) => {
          this.plugin.settings.processNewMarkdown = value;
          await this.plugin.saveSettings();
        })
      );

    // ── 存储命名 ──
    const storageNamingGroupEl = this.createSettingGroup(localizeEl, t("subgroupStorageNamingTitle"));

    const processNewAttachmentsSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("processNewAttachments"))
      .setDesc(t("processNewAttachmentsDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.processNewAttachments).onChange(async (value) => {
          this.plugin.settings.processNewAttachments = value;
          await this.plugin.saveSettings();
        })
      );

    const attachmentSaveLocationSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("attachmentSaveLocation"))
      .setDesc(t("attachmentSaveLocationDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("obsFolder", t("followObsidian"))
          .addOption("nextToNoteS", t("saveNextToNote"))
          .addOption("inFolderBelow", t("saveToRoot"))
          .setValue(this.plugin.settings.attachmentSaveLocation)
          .onChange(async (value) => {
            this.plugin.settings.attachmentSaveLocation = value;
            await this.plugin.saveSettings();
            updateAttachmentFolderSettings();
            void configPreview.refresh();
          })
      );

    const mediaFolderPathSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("mediaFolderPath"))
      .setDesc(t("mediaFolderPathDesc"))
      .setClass("media_folder_set")
      .addText((text) =>
        text.setValue(this.plugin.settings.mediaFolderPath).onChange(async (value) => {
          if (value.match(/(\)|\(|\"|\'|\#|\]|\[|\:|\>|\<|\*|\|)/g) !== null) {
            displayError(t("unsafeFolderName"));
            return;
          }
          this.plugin.settings.mediaFolderPath = value;
          await this.plugin.saveSettings();
          void configPreview.refresh();
        })
      );
    mediaFolderPathSetting.settingEl.dataset.lipConditional = "attachment-folder";

    const syncMediaFolderSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("syncMediaFolder"))
      .setDesc(t("syncMediaFolderDesc"))
      .setClass("media_folder_set")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.syncMediaFolder).onChange(async (value) => {
          this.plugin.settings.syncMediaFolder = value;
          await this.plugin.saveSettings();
          void configPreview.refresh();
        })
      );
    syncMediaFolderSetting.settingEl.dataset.lipConditional = "attachment-folder";

    const useTimestampNamingSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("useTimestampNaming"))
      .setDesc(t("useTimestampNamingDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.useTimestampNaming).onChange(async (value) => {
          this.plugin.settings.useTimestampNaming = value;
          await this.plugin.saveSettings();
          void configPreview.refresh();
        })
      );

    const useTimestampNamingForAttachmentsSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("useTimestampNamingForAttachments"))
      .setDesc(t("useTimestampNamingForAttachmentsDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useTimestampNamingForAttachments)
          .onChange(async (value) => {
            this.plugin.settings.useTimestampNamingForAttachments = value;
            await this.plugin.saveSettings();
            void configPreview.refresh();
          })
      );

    const appendOriginalNameSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("appendOriginalName"))
      .setDesc(t("appendOriginalNameDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.appendOriginalName).onChange(async (value) => {
          this.plugin.settings.appendOriginalName = value;
          await this.plugin.saveSettings();
          void configPreview.refresh();
        })
      );

    const preserveCaptionsSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("preserveCaptions"))
      .setDesc(t("preserveCaptionsDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.preserveCaptions).onChange(async (value) => {
          this.plugin.settings.preserveCaptions = value;
          await this.plugin.saveSettings();
          void configPreview.refresh();
        })
      );

    const linkPathFormatSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("linkPathFormat"))
      .setDesc(t("linkPathFormatDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("baseFileName", t("filenameOnly"))
          .addOption("onlyRelative", t("relativePath"))
          .addOption("fullDirPath", t("fullPath"))
          .setValue(this.plugin.settings.linkPathFormat)
          .onChange(async (value) => {
            this.plugin.settings.linkPathFormat = value;
            await this.plugin.saveSettings();
            void configPreview.refresh();
          })
      );

    const skipObsidianFolderCreationSetting = this.createSetting(storageNamingGroupEl)
      .setName(t("skipObsidianFolderCreation"))
      .setDesc(t("skipObsidianFolderCreationDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.skipObsidianFolderCreation).onChange(async (value) => {
          this.plugin.settings.skipObsidianFolderCreation = value;
          await this.plugin.saveSettings();
          void configPreview.refresh();
        })
      );

    // ── 下载行为 ──
    const downloadGroupEl = this.createSettingGroup(localizeEl, t("subgroupDownloadTitle"));

    this.createSetting(downloadGroupEl)
      .setName(t("downloadRetryCount"))
      .setDesc(t("downloadRetryCountDesc"))
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.downloadRetryCount))
          .onChange(async (value: string) => {
            const num = Number(value.trim());
            if (!Number.isInteger(num) || num < 1 || num > 6) {
              displayError(t("downloadRetryCountInvalid"));
              return;
            }
            this.plugin.settings.downloadRetryCount = num;
            await this.plugin.saveSettings();
          })
      );

    this.createSetting(downloadGroupEl)
      .setName(t("downloadUnknownTypes"))
      .setDesc(t("downloadUnknownTypesDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.downloadUnknownTypes).onChange(async (value) => {
          this.plugin.settings.downloadUnknownTypes = value;
          await this.plugin.saveSettings();
        })
      );

    this.createSetting(downloadGroupEl)
      .setName(t("minFileSizeKB"))
      .setDesc(t("minFileSizeKBDesc"))
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.minFileSizeKB))
          .onChange(async (value: string) => {
            const num = Number(value.trim());
            if (!Number.isInteger(num) || num < 0) {
              displayError(t("positiveIntegerInvalid"));
              return;
            }
            this.plugin.settings.minFileSizeKB = num;
            await this.plugin.saveSettings();
          })
      );

    this.createSetting(downloadGroupEl)
      .setName(t("excludedExtensions"))
      .setDesc(t("excludedExtensionsDesc"))
      .addText((text) =>
        text.setValue(this.plugin.settings.excludedExtensions).onChange(async (value) => {
          this.plugin.settings.excludedExtensions = value;
          await this.plugin.saveSettings();
        })
      );

    // ── 图片压缩 ──
    const compressionGroupEl = this.createSettingGroup(localizeEl, t("subgroupCompressionTitle"));

    this.createSetting(compressionGroupEl)
      .setName(t("compressImage"))
      .setDesc(t("compressImageDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.compressImage).onChange(async (value) => {
          this.plugin.settings.compressImage = value;
          await this.plugin.saveSettings();
          this.toggleCompressionOptions(compressionOptionsEl, value);
        })
      );

    const compressionOptionsEl = localizeEl.createDiv({
      cls: "lip-settings-dependent",
    });

    this.createSetting(compressionOptionsEl)
      .setName(t("compressionFormat"))
      .setDesc(t("compressionFormatDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("image/webp", "WebP")
          .addOption("image/jpeg", "JPEG")
          .setValue(this.plugin.settings.compressionFormat)
          .onChange(async (value) => {
            this.plugin.settings.compressionFormat = value;
            await this.plugin.saveSettings();
          });
      });

    this.createSetting(compressionOptionsEl)
      .setName(t("compressionQuality"))
      .setDesc(t("compressionQualityDesc"))
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.compressionQuality))
          .onChange(async (value: string) => {
            const num = Number(value.trim());
            if (!Number.isInteger(num) || num < 10 || num > 100) {
              displayError(t("compressionQualityInvalid"));
              return;
            }
            this.plugin.settings.compressionQuality = num;
            await this.plugin.saveSettings();
          })
      );

    this.toggleCompressionOptions(compressionOptionsEl, this.plugin.settings.compressImage);

    // ── 图片预览 ──
    const previewEl = sectionEls.get("preview")!;
    const globalGroupEl = this.createSettingGroup(previewEl, t("subgroupGlobalTitle"));

    this.createSetting(globalGroupEl)
      .setName(t("showNotifications"))
      .setDesc(t("showNotificationsDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showNotifications).onChange(async (value) => {
          this.plugin.settings.showNotifications = value;
          await this.plugin.saveSettings();
        })
      );

    const previewGroupEl = this.createSettingGroup(previewEl, t("subgroupPreviewTitle"));

    if (Platform.isDesktop) {
      this.createSetting(previewGroupEl)
        .setName(t("clickPreviewEnabled"))
        .setDesc(t("clickPreviewEnabledDesc"))
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.clickPreviewEnabled).onChange(async (value) => {
            this.plugin.settings.clickPreviewEnabled = value;
            await this.plugin.saveSettings();
          })
        );

      this.createSetting(previewGroupEl)
        .setName(t("previewAdaptiveRatio"))
        .setDesc(t("previewAdaptiveRatioDesc"))
        .addSlider((slider) => {
          slider
            .setLimits(0.1, 1, 0.05)
            .setValue(this.plugin.settings.previewAdaptiveRatio)
            .setDynamicTooltip()
            .onChange(async (value) => {
              this.plugin.settings.previewAdaptiveRatio = value;
              new Notice(`${t("previewAdaptiveRatioNotice")}: ${value}`);
              await this.plugin.saveSettings();
            });
        });
    } else {
      this.createSetting(previewGroupEl)
        .setDesc(t("previewMobileDesc"));
    }

    const cleanupGroupEl = this.createSettingGroup(previewEl, t("subgroupCleanupTitle"));

    this.createSetting(cleanupGroupEl)
      .setName(t("showCleanupRibbon"))
      .setDesc(t("showCleanupRibbonDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showCleanupRibbon).onChange(async (value) => {
          this.plugin.settings.showCleanupRibbon = value;
          await this.plugin.saveSettings();
          this.plugin.refreshRibbonIcons();
        })
      );

    this.createSetting(cleanupGroupEl)
      .setName(t("deleteDestination"))
      .setDesc(t("deleteDestinationDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("permanent", t("deletePermanent"))
          .addOption(".trash", t("deleteObsidianTrash"))
          .addOption("system-trash", t("deleteSystemTrash"))
          .setValue(this.plugin.settings.deleteDestination)
          .onChange(async (value) => {
            this.plugin.settings.deleteDestination = value;
            await this.plugin.saveSettings();
            this.updateDeleteDangerWarning(deleteWarningEl, value, t);
          });
      });

    const deleteWarningEl = previewEl.createDiv({
      cls: "lip-settings-danger-warning",
    });
    this.updateDeleteDangerWarning(deleteWarningEl, this.plugin.settings.deleteDestination, t);

    this.createSetting(cleanupGroupEl)
      .setName(t("showOperationLogs"))
      .setDesc(t("showOperationLogsDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showOperationLogs).onChange(async (value) => {
          this.plugin.settings.showOperationLogs = value;
          await this.plugin.saveSettings();
        })
      );

    this.createSetting(cleanupGroupEl)
      .setName(t("excludedFolders"))
      .setDesc(t("excludedFoldersDesc"))
      .addTextArea((text) => {
        text
          .setPlaceholder(t("excludedFoldersPlaceholder"))
          .setValue(this.plugin.settings.excludedFolders)
          .onChange(async (value) => {
            const foldersArray = value.split(/\r?\n|\r|\n/g);
            if (foldersArray.length >= 1) {
              const regexconverted = trimAny(
                foldersArray
                  .map((folderPath) => {
                    const cleaned = trimAny(folderPath, [" ", "|", "/", "\\"]);
                    if (cleaned !== "") {
                      return `(^${cleaned}$)`;
                    }
                    return "";
                  })
                  .join("|")
                  .replace("\\", "/"),
                [" ", "|", "/", "\\"]
              );

              this.plugin.settings.excludedFolders = value;
              this.plugin.settings.excludedFoldersRegexp = regexconverted;
              await this.plugin.saveSettings();
              logError(`Excluded folders regex: ${regexconverted}`);
            }
          });

        text.inputEl.rows = 5;
        text.inputEl.style.width = "100%";
      });

    this.createSetting(cleanupGroupEl)
      .setName(t("excludeSubfolders"))
      .setDesc(t("excludeSubfoldersDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.excludeSubfolders).onChange(async (value) => {
          this.plugin.settings.excludeSubfolders = value;
          await this.plugin.saveSettings();
        })
      );

    // ── 命令面板 ──
    this.createCommandDetails(previewEl, t("commandPaletteSummary"), [
      { name: t("cmdLocalizeObsidian"), desc: t("cmdLocalizeObsidianDesc") },
      { name: t("cmdLocalizePlugin"), desc: t("cmdLocalizePluginDesc") },
      { name: t("cmdBatchLocalize"), desc: t("cmdBatchLocalizeDesc") },
      { name: t("cmdClearImages"), desc: t("cmdClearImagesDesc") },
      { name: t("cmdClearAttachments"), desc: t("cmdClearAttachmentsDesc") },
      { name: t("cmdClearOrphans"), desc: t("cmdClearOrphansDesc") },
    ]);

    updateAutoProcessSettings();
    updateAttachmentFolderSettings();
  }
}
